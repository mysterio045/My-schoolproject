# API Reference (Phase 4A)

Reference for the Auth, Menu, and Customer REST endpoints implemented in Phase 4A.

Base URL: `http://127.0.0.1:8000` (dev). All endpoints are prefixed with `/api`.

| Module | Base path |
|---|---|
| Authentication | `/api/auth` |
| Menu | `/api/menu` |
| Customers | `/api/customers` |

## Conventions

- **Auth**: Write endpoints that change data require a Bearer token:
  `Authorization: Bearer <access_token>`.
  Missing/invalid tokens return `401 Unauthorized`.
- **Money**: Prices and spending are `Decimal` internally but serialize as JSON
  **numbers** (floats), not strings.
- **Pagination**: List endpoints return the envelope
  `{ items, total, page, page_size, pages }`. Query `?page=1&page_size=20`
  (page ≥ 1, 1 ≤ page_size ≤ 100).
- **Errors**: `422` = validation failure, `404` = not found, `401` = unauthorized,
  `409` = conflict (duplicate).

---

## Authentication

### POST `/api/auth/register`
Public. Create a new admin account.

Request body (`AdminCreate`):

| Field | Type | Rules |
|---|---|---|
| email | string (email) | unique |
| name | string | 1–255 chars |
| password | string | 8–128 chars, min 8 |

Responses:
- `201` → `AdminRead` (never includes `password_hash`)
- `422` → invalid email / password too short
- `409` → email already registered

`AdminRead`:

```json
{ "id": "uuid", "email": "a@b.com", "name": "A", "is_active": true,
  "created_at": "...", "updated_at": "..." }
```

### POST `/api/auth/login`
Public. Verify credentials, return a JWT.

Request body (`AdminLogin`): `{ "email": "...", "password": "..." }`

Responses:
- `200` → `TokenResponse`

```json
{ "access_token": "<jwt>", "token_type": "bearer", "expires_in": 3600 }
```

- `401` → bad credentials or inactive account
- `422` → malformed body

### GET `/api/auth/me`
Auth required. Return the authenticated admin's profile.

Responses:
- `200` → `AdminRead`
- `401` → missing/invalid/inactive token

---

## Menu

Category routes are declared before item routes so `/categories` is matched
literally (item ids are UUIDs).

### GET `/api/menu/categories`
Public. List all categories ordered by `sort_order`, then name.

Responses:
- `200` → `MenuCategoryRead[]`

### POST `/api/menu/categories`
Auth. Create a category.

Request body (`MenuCategoryCreate`):

| Field | Type | Rules |
|---|---|---|
| name | string | 1–100 chars |
| description | string? | optional |
| sort_order | integer | ≥ 0, default 0 |

Responses: `201` → `MenuCategoryRead`, `409` (duplicate name), `422`, `401`.

### PATCH `/api/menu/categories/{category_id}`
Auth. Update a category (any subset of fields).

Responses: `200` → `MenuCategoryRead`, `404`, `409`, `422`, `401`.

### GET `/api/menu`
Public. List menu items with filters + pagination.

Query params:
- `page`, `page_size` — pagination
- `category_id` — filter by category UUID
- `available` — `true` / `false`

Ordering: available first, then category `sort_order`, then name.

Responses: `200` → `Page<MenuItemRead>`.

### GET `/api/menu/{item_id}`
Public. Get one item.

Responses: `200` → `MenuItemRead`, `404`.

### POST `/api/menu`
Auth. Create an item.

Request body (`MenuItemCreate`):

| Field | Type | Rules |
|---|---|---|
| category_id | UUID | must exist (else 404) |
| name | string | 1–255 chars |
| description | string? | optional |
| price | number | > 0, ≤ 10 digits, 2 decimals |
| available | bool | default true |
| image | string? | ≤ 255 chars |

Responses: `201` → `MenuItemRead`, `404` (bad category), `422`, `401`.

### PATCH `/api/menu/{item_id}`
Auth. Update any subset of item fields.

Responses: `200` → `MenuItemRead`, `404`, `422`, `401`.

### PATCH `/api/menu/{item_id}/toggle`
Auth. Flip `available` between true/false.

Responses: `200` → `MenuItemRead` (with new `available`), `404`, `401`.

`MenuItemRead`:

```json
{ "id": "uuid", "category_id": "uuid", "name": "...", "description": null,
  "price": 3500.0, "available": true, "image": null,
  "rating": 0.0, "order_count": 0, "created_at": "...", "updated_at": "..." }
```

---

## Customers

All customer endpoints are **auth required** (admin viewing customers).
Write operations (create/update) are not implemented in Phase 4A.

### GET `/api/customers`
Auth. List customers with search + pagination.

Query params:
- `page`, `page_size` — pagination
- `search` — case-insensitive match against name, phone, or email

Responses:
- `200` → `Page<CustomerRead>`
- `401` → not authenticated

### GET `/api/customers/{customer_id}`
Auth. Get one customer including their order history (newest first).

Responses:
- `200` → `CustomerDetailRead` = `CustomerRead` + `orders: OrderRead[]`
- `404` → customer not found
- `401` → not authenticated

`CustomerRead`:

```json
{ "id": "uuid", "name": "...", "phone": "...", "email": null,
  "address": null, "status": "active", "total_orders": 0,
  "total_spent": 0.0, "last_order_at": null,
  "created_at": "...", "updated_at": "..." }
```

---

## Dispatch (Phase 4D)

Assign the nearest eligible available rider to a `ready` order. Full design notes
in [`dispatch.md`](dispatch.md).

Both endpoints are **auth required** and delegate to the same
`dispatch_service.assign_nearest_rider`.

### POST `/api/dispatch/nearest-rider`
Auth. Assign the nearest eligible available rider (`status = 'available'` with
non-null `lat`/`lng`) to a ready order. Distance is computed live with the
Haversine formula; ties broken by ascending rider id.

Request body (`DispatchRequest`): `{ "order_id": "uuid" }`

Responses:
- `200` → `DispatchResultRead`
  (`{ delivery, rider, distance_km, message }`) — delivery becomes `assigned`
  (with `assigned_at`), rider becomes `busy`, `Rider Assigned` timeline added,
  order stays `ready`.
- `400` → order not `ready`, or delivery not `pending`
- `404` → order/delivery not found, or `No available riders`
- `409` → delivery already has a rider
- `401` → not authenticated

### POST `/api/dispatch/assign`
Auth. Explicit alias for `nearest-rider` (same service call, same contract).

---

## Endpoint Summary

| Method | Path | Auth | Summary |
|---|---|---|---|
| POST | `/api/auth/register` | – | Register admin |
| POST | `/api/auth/login` | – | Login, get JWT |
| GET | `/api/auth/me` | ✓ | Current profile |
| GET | `/api/menu/categories` | – | List categories |
| POST | `/api/menu/categories` | ✓ | Create category |
| PATCH | `/api/menu/categories/{id}` | ✓ | Update category |
| GET | `/api/menu` | – | List items |
| GET | `/api/menu/{id}` | – | Get item |
| POST | `/api/menu` | ✓ | Create item |
| PATCH | `/api/menu/{id}` | ✓ | Update item |
| PATCH | `/api/menu/{id}/toggle` | ✓ | Toggle availability |
| GET | `/api/customers` | ✓ | List customers |
| GET | `/api/customers/{id}` | ✓ | Customer + orders |
| POST | `/api/dispatch/nearest-rider` | ✓ | Assign nearest available rider |
| POST | `/api/dispatch/assign` | ✓ | Alias for nearest-rider |

Interactive docs: `http://127.0.0.1:8000/docs` (Swagger UI).
