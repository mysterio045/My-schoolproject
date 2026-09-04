# Smart Rider Dispatch Engine (Phase 4D)

Reference for the FastAPI dispatch endpoints that assign the nearest eligible,
available rider to an order that is ready for delivery.

Base URL: `http://127.0.0.1:8000` (dev). Endpoints are under `/api/dispatch`.

| Module | Base path |
|---|---|
| Dispatch | `/api/dispatch` |

## Overview

When an order reaches the kitchen status `ready`, the dispatch engine selects the
geographically nearest eligible rider and assigns it to the order's delivery
record in one atomic transaction.

- **Eligible rider** = `status = 'available'` **and** both `lat` and `lng` are
  present (`NOT NULL`). Busy / offline riders and riders missing coordinates are
  ignored.
- **Nearest** = smallest great-circle distance from the restaurant (Haversine)
  using `rider.lat`/`rider.lng` and the configured `RESTAURANT_LAT` /
  `RESTAURANT_LNG`. The cached `riders.distance_from_restaurant` column is
  **not** used for selection.
- **Tie-break** = equal distances are ordered deterministically by ascending
  rider id, so selection never depends on row-return order.

## Concurrency / transaction safety

Selection + assignment happen inside a single transaction. Eligible rider rows
are locked with PostgreSQL `SELECT ... FOR UPDATE` (see
`app/services/dispatch_service.py`). Under `READ COMMITTED`, a concurrent
dispatch request that reaches the same statement blocks on the locked rows; after
the first transaction commits, the waiting transaction re-evaluates its predicate
(the selected rider is now `busy`) and either picks a different rider or fails
with `No available riders`. This guarantees a rider is never assigned to two
orders at once — verified by a real concurrency test in `verify_phase4d.py`.

## Validation / errors

| Condition | HTTP | Detail |
|---|---|---|
| Order does not exist | `404` | `Order not found.` |
| Order not in `ready` state | `400` | `Order is not ready for dispatch ...` |
| No delivery record | `404` | `No delivery record exists for this order.` |
| Delivery already assigned | `409` | `This delivery already has a rider assigned.` |
| Delivery not in `pending` state | `400` | `Delivery is not dispatchable ...` |
| No eligible rider | `404` | `No available riders.` |
| Missing/invalid token | `401` | `Not authenticated` / `Invalid or expired token ...` |

All write endpoints require a Bearer token (`Authorization: Bearer <token>`).

## Endpoints

### POST `/api/dispatch/nearest-rider`

Auth required. Assign the nearest eligible available rider to a ready order.

Request body (`DispatchRequest`):

```json
{ "order_id": "uuid" }
```

Responses:
- `200` → `DispatchResultRead`
- `400` / `404` / `409` / `401` → see table above

`DispatchResultRead`:

```json
{
  "delivery": {
    "id": "uuid", "order_id": "uuid", "rider_id": "uuid",
    "status": "assigned", "assigned_at": "...",
    "order": { "id": "uuid", "status": "ready", "...": "..." }
  },
  "rider": { "id": "uuid", "name": "...", "status": "busy", "...": "..." },
  "distance_km": 1.11,
  "message": "Nearest available rider assigned successfully"
}
```

- The delivery's `rider_id` is set, `status` becomes `assigned`, and
  `assigned_at` is recorded.
- The rider's `status` becomes `busy`.
- An `OrderTimeline` entry `{ status: "assigned", label: "Rider Assigned" }` is
  appended. The order's kitchen status remains `ready`.

### POST `/api/dispatch/assign`

Auth required. Explicit alias for `/api/dispatch/nearest-rider`. It calls the
**same** centralized service function
(`dispatch_service.assign_nearest_rider`) so assignment logic is never
duplicated. Identical request/response contract.

## Implementation notes

- All business logic lives in `app/services/dispatch_service.py`; route handlers
  in `app/api/routes/dispatch.py` stay thin.
- A dispatch failure leaves the database unchanged: the service raises `HTTPException`
  before any assignment is committed, and the failed transaction is rolled back.
- The service commits internally, then re-fetches the delivery (with its nested
  order, items, and timeline) and the selected rider so the response is fresh and
  serializer-safe (`populate_existing=True`; `delivery.order` is eager-loaded so
  no lazy async reload happens during response validation).
