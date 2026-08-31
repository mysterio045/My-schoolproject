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
CORS_ORIGINS=http://localhost:3000
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

## Current Status

Phases 1–3 and Phase 4A (Auth, Menu, Customers) complete. Working:
- FastAPI application with CORS
- Async SQLAlchemy + asyncpg configuration (Supabase pooler-compatible)
- Health check endpoint at `/health`
- Swagger UI at `/docs`
- 10-table database schema + Alembic migration (`001_initial`)
- All Pydantic request/response schemas
- Auth (register / login / me) with JWT
- Menu (categories + items, CRUD + availability toggle)
- Customers (list / search / pagination / detail with order history)

## Development Phases

| Phase | Status |
|---|---|
| 1. Foundation (app, config, database, health check) | Complete |
| 2. Database models + migrations | Complete |
| 3. Pydantic schemas | Complete |
| 4. Seed data | Pending |
| 5. Authentication | Complete (Phase 4A) |
| 6. Core features (Menu, Customers, Orders, Riders, Deliveries) | In progress (Phase 4A: Menu + Customers done; Orders/Riders/Deliveries pending) |
| 7. Dispatch algorithm | Pending |
| 8. Analytics | Pending |
| 9. Notifications | Pending |

## Frontend Integration

The existing Next.js frontend (in `frontend/src/`) currently uses mock data. After Phase 9, the frontend's `AppContext` will be updated to fetch from this API instead of using hardcoded mock data.
