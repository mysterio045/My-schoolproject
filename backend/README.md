# Smart Food Ordering — Backend API

Backend REST API for the Smart Food Ordering and Rider Dispatch System. Built for Hasinah Confectionery & Restaurant, Dutse, Jigawa State, Nigeria.

## Tech Stack

| Component | Technology |
|---|---|
| Python | 3.12+ |
| Framework | FastAPI (async) |
| ORM | SQLAlchemy 2.0 (async) |
| Database | PostgreSQL via Supabase |
| Driver | asyncpg |
| Migrations | Alembic |
| Auth | JWT (python-jose + passlib) |

## Project Structure

```
backend/
├── app/
│   ├── main.py            # FastAPI entry point
│   ├── config.py          # Environment variables (Pydantic Settings)
│   ├── database.py        # Async SQLAlchemy engine + session
│   ├── api/               # Route handlers (thin: validation → service → response)
│   │   ├── deps.py        # Shared dependencies (get_db, get_current_user)
│   │   ├── auth.py
│   │   ├── orders.py
│   │   ├── deliveries.py
│   │   ├── riders.py
│   │   ├── menu.py
│   │   ├── customers.py
│   │   ├── dispatch.py
│   │   ├── analytics.py
│   │   └── notifications.py
│   ├── models/            # SQLAlchemy ORM models (DB tables)
│   ├── schemas/           # Pydantic request/response validation
│   └── services/          # Business logic layer
├── docs/                  # Architecture + API documentation
├── alembic/               # Database migrations
├── seed.py                # Seed database with mock data
├── requirements.txt
└── .env.example
```

## Quick Start

### 1. Prerequisites

- Python 3.12 or later
- A Supabase project (or any PostgreSQL database)

### 2. Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
copy .env.example .env
# Then edit .env with your Supabase database URL and JWT secret
```

### 3. Configure Environment

Edit `.env` with your values:

```env
DATABASE_URL=postgresql+asyncpg://postgres:your_password@db.your-project.supabase.co:5432/postgres
JWT_SECRET_KEY=your-super-secret-random-key
CORS_ORIGINS=http://localhost:3000   # match the Next.js frontend dev origin; 127.0.0.1 is NOT allowed by default
```

### 4. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Verify

- **Health check:** http://localhost:8000/health
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

The health endpoint should return:

```json
{"status": "ok"}
```

### 6. Run the verification suites

After the server is running, the bundled scripts exercise the implementation
end-to-end against the live server and database:

```bash
# Phase 1-3: schema, migration, and model integrity (50 checks)
python verify_all.py

# Phase 4A: Auth, Menu, and Customer endpoints (29 checks)
python verify_phase4a.py

# Phase 4B: Orders and Deliveries endpoints (44 checks)
python verify_phase4b.py

# Phase 4C: Riders and Notifications endpoints (38 checks)
python verify_phase4c.py

# Phase 4D: Smart Rider Dispatch endpoints (29 checks)
python verify_phase4d.py
```

Each suite prints `[PASS]`/`[FAIL]` per check and a final tally, and cleans up
any test records it creates.

> **Note:** passwords are hashed with bcrypt. `requirements.txt` pins
> `bcrypt==4.0.1` because the pinned `passlib==1.7.4` is incompatible with
> bcrypt >= 4.1 (`__about__` AttributeError).

## Architecture Principles

### Route → Service → Database

Route handlers are thin. They handle:
1. Request validation (via Pydantic schemas)
2. Service method calls
3. Response formatting

All business logic lives in the `services/` layer.

### Order vs Delivery Separation

- **Order** = what the customer purchased (items, totals, status: pending → confirmed → preparing → ready → completed/cancelled)
- **Delivery** = logistics operation (rider assignment, pickup/dropoff, status: pending → assigned → accepted → picked_up → on_the_way → delivered/failed)

The API may expose combined status for frontend compatibility, but the database keeps them separate.

### Notification Recipients (Polymorphic)

The `notifications` table uses `recipient_type` + `recipient_id` to support admin, customer, and rider notifications from the same table. Since PostgreSQL foreign keys cannot validate against multiple tables, recipient validation happens in application logic.

### Dispatch Engine (Concurrency Safety)

Dispatching a rider to an order is done in a **single transaction**:

- Selection locks eligible rider rows with PostgreSQL `SELECT ... FOR UPDATE`
  (`status = 'available'`, non-null `lat`/`lng`).
- Distance is computed dynamically with the Haversine formula from
  `rider.lat`/`rider.lng` + `RESTAURANT_LAT`/`RESTAURANT_LNG`. The cached
  `riders.distance_from_restaurant` column is **never** used for selection.
- The nearest rider is chosen; equal distances are broken deterministically by
  ascending rider id. The rider is marked `busy`, the delivery is set to
  `assigned` (with `assigned_at`), and a `Rider Assigned` timeline entry is added.

Under READ COMMITTED, concurrent dispatch requests that reach the same statement
block on the locked rows; when the first transaction commits, the waiting one
re-evaluates the predicate (the locked rider is now busy) and selects a different
rider — or fails with `No available riders`. This guarantees the same rider is
never assigned to two orders at once.

## Current Status

Phases 1–3, Phase 4A (Auth, Menu, Customers), Phase 4B (Orders, Deliveries),
Phase 4C (Riders, Notifications), and Phase 4D (Smart Rider Dispatch) complete.
Working:
- FastAPI application with CORS
- Async SQLAlchemy + asyncpg configuration (Supabase pooler-compatible)
- Health check endpoint at `/health`
- Swagger UI at `/docs`
- 10-table database schema + Alembic migration (`001_initial`)
- All Pydantic request/response schemas
- Auth (register / login / me) with JWT
- Menu (categories + items, CRUD + availability toggle)
- Customers (list / search / pagination / detail with order history)
- Orders (create w/ server-side pricing, list, detail, kitchen status lifecycle)
- Deliveries (list, get by id/order, logistics status lifecycle w/ timestamps)
- Riders (CRUD, list w/ search + status filter, detail w/ delivery history, availability status)
- Notifications (create, list for a recipient, unread filter/count, mark read/unread)
- Dispatch (assign the nearest eligible available rider to a 'ready' order,
  atomic `SELECT ... FOR UPDATE` selection with haversine distance + deterministic
  tie-break, marks rider busy, records the timeline event)

## Development Phases

| Phase | Status |
|---|---|
| 1. Foundation (app, config, database, health check) | Complete |
| 2. Database models + migrations | Complete |
| 3. Pydantic schemas | Complete |
| 4. Seed data | Pending |
| 5. Authentication | Complete (Phase 4A) |
| 6. Core features (Menu, Customers, Orders, Riders, Deliveries) | Complete (Phases 4A/4B/4C) |
| 7. Dispatch algorithm | Complete (Phase 4D) |
| 8. Notifications | Complete (Phase 4C) |
| 9. Analytics | Pending |
| 10. Real-time tracking | Pending |

## Frontend Integration

The Next.js frontend lives at the repo root (`src/`). A centralized API client
(`src/lib/api/client.ts`) points at the backend via `NEXT_PUBLIC_API_URL`
(see `.env.example`), and Phase 5A wired frontend authentication
(`src/lib/auth/*`, `AuthProvider`) to `/api/auth/login` and `/api/auth/me`.
Business pages still render mock data; from Phase 5B onward they will fetch
from this API instead of using hardcoded mock data.
