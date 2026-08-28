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

Phase 1 complete. The following are working:
- FastAPI application with CORS
- Async SQLAlchemy + asyncpg configuration
- Health check endpoint at `/health`
- Swagger UI at `/docs`

## Development Phases

| Phase | Status |
|---|---|
| 1. Foundation (app, config, database, health check) | Complete |
| 2. Database models + migrations | Pending |
| 3. Pydantic schemas | Pending |
| 4. Seed data | Pending |
| 5. Authentication | Pending |
| 6. Core features (Menu, Customers, Orders, Riders, Deliveries) | Pending |
| 7. Dispatch algorithm | Pending |
| 8. Analytics | Pending |
| 9. Notifications | Pending |

## Frontend Integration

The existing Next.js frontend (in `frontend/src/`) currently uses mock data. After Phase 9, the frontend's `AppContext` will be updated to fetch from this API instead of using hardcoded mock data.
