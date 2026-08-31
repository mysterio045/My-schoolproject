# Phase 3 — Pydantic Schemas (Request/Response Models)

## What is a Schema?

A **schema** is the contract that defines what data can enter the API and
what data the API returns. It is the "middle layer" between the outside world
(HTTP requests/responses) and the database (ORM models).

Think of it this way:

```
Client (JSON)  →  SCHEMA (validate/convert)  →  Service layer  →  ORM  →  Database
Client (JSON)  ←  SCHEMA (serialize)         ←  Service layer  ←  ORM  ←  Database
```

- **Request schemas** (`*Create`, `*Update`, `*Login`, ...) validate the
  data a client sends *before* it touches the database.
- **Response schemas** (`*Read`) define the shape of data returned to the
  client, *hiding_ fields that should never be exposed (e.g. `password_hash`).

We use **Pydantic v2** (a validation/serialization library). FastAPI reads
these schemas to generate the interactive Swagger docs and to automatically
parse/validate request bodies.

---

## Files in this phase

```
backend/app/schemas/
├── __init__.py       # Re-exports every schema (single import point)
├── common.py         # BaseSchema, pagination, Page envelope
├── admin.py          # Admin auth + profile
├── customer.py       # Customer create/update/read
├── rider.py          # Rider create/update/read/location
├── menu.py           # MenuCategory + MenuItem
├── order.py          # Order, OrderItem, OrderTimeline
├── delivery.py       # Delivery + AssignRider + status update
└── notification.py   # Polymorphic notifications
```

---

## common.py — the base layer

```python
class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={Decimal: float},
    )
```

Two key behaviors inherited by **every** schema:

1. **`from_attributes=True`** — lets us build a response directly from a
   database object:
   ```python
   OrderRead.model_validate(db_order)   # db_order is a SQLAlchemy Order
   ```
   Pydantic reads attributes off the ORM object by the same name.

2. **`json_encoders={Decimal: float}`** — money fields are stored as
   `Decimal` (never floating point, to avoid rounding errors), but Pydantic
   v2 would normally send them to JSON as *strings*. This setting converts
   them to JSON *numbers* for the frontend:
   ```json
   {"total": 8500.0}   // before this setting it was {"total": "8500.00"}
   ```

### Pagination

```python
class PageParams(BaseModel):          # ?page=1&page_size=20
    page: int = Field(default=1, ge=1, le=100_000)
    page_size: int = Field(default=20, ge=1, le=100)

class Page(BaseModel, Generic[T]):    # generic response envelope
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int
```

`Page[T]` is a **generic** — you plug in any `*Read` schema:
`Page[OrderRead]`, `Page[RiderRead]`, etc. This gives every list endpoint the
same, predictable envelope:
```json
{ "items": [...], "total": 12, "page": 1, "page_size": 20, "pages": 1 }
```

---

## admin.py — authentication

| Schema          | Purpose                                        |
|-----------------|------------------------------------------------|
| `AdminCreate`   | Register an admin (validates email + password) |
| `AdminLogin`    | Login payload (email + password)               |
| `AdminRead`     | Admin profile — **excludes `password_hash`**   |
| `AdminUpdate`   | Optional editable profile fields               |
| `TokenResponse` | JWT access token returned on login             |

```python
class AdminCreate(BaseSchema):
    email: EmailStr          # requires the `email-validator` package
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)
```

- `EmailStr` validates the format of the email.
- A `@field_validator` rejects weak passwords before hashing.
- `AdminRead` deliberately omits `password_hash` so we can never leak it.

---

## Money handling (important)

All money fields are `Decimal` in the schemas:
```python
total: Decimal
subtotal: Decimal
delivery_fee: Decimal
price: Decimal = Field(gt=Decimal("0"), max_digits=10, decimal_places=2)
```

- `gt=0` rejects negative prices.
- `max_digits` / `decimal_places` enforce the same precision as the database
  `NUMERIC` columns.
- The base config converts them to JSON numbers on output.

---

## order.py — nested structures

Orders are the most complex because an **order contains line items** and a
**timeline**. We model this with nested schemas:

```python
class OrderCreate(BaseSchema):
    customer_id: uuid.UUID
    items: list[OrderItemCreate] = Field(min_length=1)   # nested
    delivery_address: str
    notes: str | None = None
    estimated_delivery: datetime | None = None
```

- Clients only send `menu_item_id` + `quantity`. The service fills in the
  snapshot fields (`name_snapshot`, `unit_price`) from the menu.
- `@model_validator` rejects an order with zero items.

```python
class OrderRead(BaseSchema):
    ...
    items: list[OrderItemRead] = Field(default_factory=list)  # nested responses
    timeline: list[OrderTimelineRead] = Field(default_factory=list)
```

The response nests the items and timeline, so a single `GET /orders/{id}`
call returns everything the dashboard needs.

### Snapshots recap

Orders capture `customer_name/phone/address` and items capture
`name_snapshot/unit_price` *at order time* — see `database.md`. The schemas
reflect this: `OrderRead` includes the snapshot fields, and `OrderCreate`
does not (the service fills them).

---

## delivery.py — dispatch schemas

```python
class DeliveryCreate(BaseSchema):     # start dispatch for an order
    order_id: uuid.UUID
    pickup_location: str | None
    delivery_location: str | None

class AssignRiderRequest(BaseSchema):  # attach a rider
    rider_id: uuid.UUID

class DeliveryStatusUpdate(BaseSchema):  # advance logistics lifecycle
    status: DeliveryStatus
    failure_reason: str | None = None   # required when status = failed

class DeliveryWithOrderRead(DeliveryRead):  # dispatch dashboard payload
    order: OrderRead
```

- `DeliveryWithOrderRead` **inherits** `DeliveryRead` and adds a nested
  `order`. This is the payload the dispatch board renders (delivery progress
  + order context).

### Delivery status lifecycle (enforced in the service layer in Phase 6)
```
pending → assigned → accepted → picked_up → on_the_way → delivered / failed
```

---

## notification.py — polymorphic recipient

```python
class NotificationCreate(BaseSchema):
    recipient_type: NotificationRecipientType   # admin | customer | rider
    recipient_id: uuid.UUID
    type: NotificationType
    title: str
    message: str
```

`recipient_type` + `recipient_id` together point at a record in *one of three*
tables. The database cannot enforce this FK (see `database.md`), so the
service layer validates the recipient exists.

---

## How FastAPI uses these

```python
# Example (Phase 4 — NOT yet implemented)
@app.post("/api/v1/orders", response_model=OrderRead)
async def create_order(payload: OrderCreate, ...):
    ...
```

- `payload: OrderCreate` → FastAPI parses + validates the JSON body.
- `response_model=OrderRead` → FastAPI validates + serializes the response
  (hidden fields stripped, money as numbers, etc.).
- Swagger at `/docs` is generated automatically from these schemas.

---

## Verification

Run the schema test script:

```bash
cd backend
python verify_schemas.py
```

Expected outcome: `ALL SCHEMA CHECKS PASSED`.

The checks confirm:
1. Every schema imports and is exported.
2. Valid payloads build successfully.
3. Invalid payloads are rejected (empty order items, negative price, bad
   email, short password, invalid page number).
4. ORM-style objects convert into response schemas (`from_attributes`).
5. Money serializes as JSON numbers, not strings.
