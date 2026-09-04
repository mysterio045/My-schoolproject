# Database Architecture

Complete reference for the PostgreSQL database schema powering the Smart Food Ordering system.

## Overview

**10 tables** organized into four domains:

| Domain | Tables |
|---|---|
| Auth | `admin_users` |
| Restaurant | `customers`, `riders`, `menu_categories`, `menu_items` |
| Orders | `orders`, `order_items`, `order_timeline` |
| Logistics | `deliveries` |
| Communication | `notifications` |

## Entity Relationships

```
admin_users (auth/admin notifications)

customers
    └── 1:N ──> orders
                    ├── 1:N ──> order_items ──> menu_items
                    ├── 1:N ──> order_timeline
                    └── 1:1 ──> deliveries ──> riders

menu_categories
    └── 1:N ──> menu_items ──> order_items

notifications (polymorphic: admin | customer | rider)
```

## Table: `admin_users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, gen_random_uuid() | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login credential |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash, never exposed via API |
| name | VARCHAR(255) | NOT NULL | Display name |
| is_active | BOOLEAN | DEFAULT true | Can disable without deleting |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `ix_admin_users_email`

---

## Table: `customers`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, gen_random_uuid() | |
| name | VARCHAR(255) | NOT NULL | |
| phone | VARCHAR(50) | NOT NULL | Nigerian format |
| email | VARCHAR(255) | NULLABLE | |
| address | TEXT | NULLABLE | Default delivery address |
| status | VARCHAR(20) | DEFAULT 'active' | active / inactive |
| total_orders | INTEGER | DEFAULT 0 | Denormalized counter |
| total_spent | NUMERIC(12,2) | DEFAULT 0.00 | Denormalized counter |
| last_order_at | TIMESTAMPTZ | NULLABLE | Denormalized |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `ix_customers_phone`

**Denormalization note:** `total_orders`, `total_spent`, and `last_order_at` are updated by the service layer on each order. This avoids expensive COUNT/SUM queries on dashboard loads.

---

## Table: `riders`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, gen_random_uuid() | |
| name | VARCHAR(255) | NOT NULL | |
| phone | VARCHAR(50) | NOT NULL | |
| email | VARCHAR(255) | NULLABLE | |
| status | VARCHAR(20) | DEFAULT 'available' | available / busy / offline |
| lat | NUMERIC(10,7) | NULLABLE | Current latitude |
| lng | NUMERIC(10,7) | NULLABLE | Current longitude |
| location_address | TEXT | NULLABLE | Human-readable address |
| distance_from_restaurant | NUMERIC(5,2) | NULLABLE | Cached km. Dispatch recalculates dynamically |
| today_deliveries | INTEGER | DEFAULT 0 | Resets daily |
| completed_deliveries | INTEGER | DEFAULT 0 | Lifetime total |
| average_delivery_time | INTEGER | DEFAULT 0 | Minutes |
| rating | NUMERIC(3,2) | DEFAULT 5.00 | Out of 5.00 |
| avatar | VARCHAR(10) | NULLABLE | Initials |
| joined_at | DATE | NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `ix_riders_status`

**Distance note:** `distance_from_restaurant` is a cached/derived field. The dispatch service (Phase 4D) calculates real-time distance using the haversine formula from rider lat/lng and the `RESTAURANT_LAT`/`RESTAURANT_LNG` configuration; it locks eligible rider rows with `SELECT ... FOR UPDATE` in a single transaction so the same rider is never assigned to two orders concurrently.

---

## Table: `menu_categories`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, gen_random_uuid() | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | e.g., "Rice", "Drinks" |
| description | TEXT | NULLABLE | |
| sort_order | INTEGER | DEFAULT 0 | Display ordering |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

---

## Table: `menu_items`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, gen_random_uuid() | |
| category_id | UUID | FK → menu_categories, NOT NULL | ondelete: RESTRICT |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULLABLE | |
| price | NUMERIC(10,2) | NOT NULL | NGN. Never negative |
| available | BOOLEAN | DEFAULT true | Toggle availability |
| image | VARCHAR(255) | NULLABLE | Path/URL |
| rating | NUMERIC(3,2) | DEFAULT 0.00 | Out of 5.00 |
| order_count | INTEGER | DEFAULT 0 | Lifetime orders (denormalized) |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `ix_menu_items_category_id`, `ix_menu_items_available`

---

## Table: `orders`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, gen_random_uuid() | |
| order_number | VARCHAR(20) | UNIQUE, NOT NULL | e.g., "ORD-1024" |
| customer_id | UUID | FK → customers, NOT NULL | ondelete: RESTRICT |
| customer_name | VARCHAR(255) | NOT NULL | Snapshot at order time |
| customer_phone | VARCHAR(50) | NOT NULL | Snapshot at order time |
| delivery_address | TEXT | NOT NULL | Snapshot at order time |
| subtotal | NUMERIC(12,2) | NOT NULL | Sum of line totals |
| delivery_fee | NUMERIC(10,2) | NOT NULL | |
| total | NUMERIC(12,2) | NOT NULL | subtotal + delivery_fee |
| status | VARCHAR(20) | DEFAULT 'pending' | See lifecycle below |
| estimated_delivery | TIMESTAMPTZ | NULLABLE | |
| notes | TEXT | NULLABLE | Special instructions |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `ix_orders_order_number`, `ix_orders_customer_id`, `ix_orders_status`, `ix_orders_created_at`

**⚠️ No rider_id here.** Rider assignment lives in the `deliveries` table.

### Order Status Lifecycle

```
pending → confirmed → preparing → ready → completed
                                                ↘ cancelled
```

| Status | Meaning |
|---|---|
| pending | Order placed, awaiting confirmation |
| confirmed | Restaurant confirmed the order |
| preparing | Kitchen is preparing the order |
| ready | Order ready for rider pickup |
| completed | Order fulfilled (delivery tracked separately) |
| cancelled | Order cancelled before completion |

---

## Table: `order_items`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, gen_random_uuid() | |
| order_id | UUID | FK → orders, NOT NULL | ondelete: CASCADE |
| menu_item_id | UUID | FK → menu_items, NOT NULL | ondelete: RESTRICT |
| name_snapshot | VARCHAR(255) | NOT NULL | Menu item name at order time |
| quantity | INTEGER | NOT NULL | Must be > 0 |
| unit_price | NUMERIC(10,2) | NOT NULL | Price at order time |
| line_total | NUMERIC(12,2) | NOT NULL | quantity × unit_price |

**Indexes:** `ix_order_items_order_id`

**Snapshot fields:** `name_snapshot` and `unit_price` preserve values at order time. If menu prices change later, historical orders remain accurate.

---

## Table: `order_timeline`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, gen_random_uuid() | |
| order_id | UUID | FK → orders, NOT NULL | ondelete: CASCADE |
| status | VARCHAR(30) | NOT NULL | Order status at this event |
| label | VARCHAR(255) | NOT NULL | Human-readable label |
| created_at | TIMESTAMPTZ | DEFAULT now() | Event timestamp |

**Indexes:** `ix_order_timeline_order_id`

---

## Table: `deliveries`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, gen_random_uuid() | |
| order_id | UUID | UNIQUE, FK → orders, NOT NULL | ondelete: RESTRICT. 1:1 with order |
| rider_id | UUID | FK → riders, NULLABLE | ondelete: SET NULL. Until assigned |
| status | VARCHAR(20) | DEFAULT 'pending' | See lifecycle below |
| pickup_location | TEXT | NULLABLE | Restaurant address |
| delivery_location | TEXT | NULLABLE | Customer address |
| assigned_at | TIMESTAMPTZ | NULLABLE | Rider assigned |
| accepted_at | TIMESTAMPTZ | NULLABLE | Rider accepted |
| picked_up_at | TIMESTAMPTZ | NULLABLE | Rider picked up food |
| delivered_at | TIMESTAMPTZ | NULLABLE | Delivery completed |
| failed_at | TIMESTAMPTZ | NULLABLE | Delivery failed |
| failure_reason | TEXT | NULLABLE | Why delivery failed |
| rider_lat | NUMERIC(10,7) | NULLABLE | Rider location at last update |
| rider_lng | NUMERIC(10,7) | NULLABLE | Rider location at last update |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `ix_deliveries_order_id`, `ix_deliveries_rider_id`, `ix_deliveries_status`

### Delivery Status Lifecycle

```
pending → assigned → accepted → picked_up → on_the_way → delivered
                                                                ↘ failed
```

| Status | Meaning |
|---|---|
| pending | Delivery created, awaiting rider assignment |
| assigned | Rider assigned, awaiting acceptance |
| accepted | Rider accepted the delivery |
| picked_up | Rider picked up food from restaurant |
| on_the_way | Rider en route to customer |
| delivered | Delivery completed successfully |
| failed | Delivery failed (rider unavailable, customer unreachable, etc.) |

---

## Table: `notifications`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK, gen_random_uuid() | |
| recipient_type | VARCHAR(20) | NOT NULL | admin / customer / rider |
| recipient_id | UUID | NOT NULL | Polymorphic FK |
| type | VARCHAR(30) | NOT NULL | order / rider / system / delivery |
| title | VARCHAR(255) | NOT NULL | |
| message | TEXT | NOT NULL | |
| read | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** `ix_notifications_recipient` (composite: recipient_type + recipient_id), `ix_notifications_read`, `ix_notifications_created_at`

### Polymorphic Relationship

`recipient_id` references different tables depending on `recipient_type`:

| recipient_type | recipient_id references |
|---|---|
| admin | admin_users.id |
| customer | customers.id |
| rider | riders.id |

PostgreSQL cannot enforce a foreign key against multiple tables. Recipient validation is handled in the application/service layer.

---

## Order vs Delivery: Why Two Tables?

An **order** represents what the customer purchased — items, totals, preparation status.

A **delivery** represents the logistics operation — rider assignment, pickup, transit, dropoff.

**Key reasons:**
1. An order exists before a rider is assigned
2. An order can be cancelled without a delivery ever being created
3. A delivery can fail while the order is re-assigned to a new delivery
4. Order status and delivery status have different lifecycles
5. Analytics need separate order metrics (revenue) and delivery metrics (delivery time)

The API may expose a combined/convenience status for frontend compatibility, but the database preserves two independent lifecycles.

---

## Migration Commands

```bash
# Generate a new migration (requires live database connection)
alembic revision --autogenerate -m "description"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Show current migration version
alembic current

# Show migration history
alembic history
```

---

## Running Against Supabase

1. Create a `.env` file in `backend/`:
   ```
   DATABASE_URL=postgresql+asyncpg://postgres:your_password@db.your-project.supabase.co:5432/postgres
   ```

2. Apply the migration:
   ```bash
   cd backend
   alembic upgrade head
   ```

3. Verify tables exist:
   ```bash
   python verify_db.py
   ```
