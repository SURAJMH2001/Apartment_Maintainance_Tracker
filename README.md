# 🏢 Apartment Society Maintenance Tracker

A full-stack, enterprise-grade web application for managing apartment society maintenance fees, resident records, financial transactions, and automated overdue alerts.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+ (Python 3.14 supported)
- Node.js 18+

### 1. Backend Setup

```powershell
cd backend

# Install dependencies
.\Scripts\pip3.14.exe install -r requirements.txt
# OR if pip is on PATH:
pip install -r requirements.txt

# Copy environment config
copy .env.example .env

# Seed database with sample data
py -3 seed.py

# Start the API server
py -3 start.py
```

Backend runs at: **http://localhost:8000**
API docs (Swagger): **http://localhost:8000/docs**

**Default login:** `admin` / `Admin@123`

---

### 2. Frontend Setup

```powershell
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 📐 Architecture

```
┌─────────────────────────────────────────────┐
│           React Frontend (Vite)             │
│  React 18 + TailwindCSS + Recharts          │
│  React Query + React Hook Form + Zustand    │
└────────────────────┬────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────┐
│          FastAPI Backend (Python)           │
│  SQLAlchemy ORM + SQLite                    │
│  JWT Auth + Rate Limiting + Audit Logging  │
└─────────────────────────────────────────────┘
```

## 🏗️ Project Structure

```
Apartment_Mainatainance_Tracker/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST endpoints
│   │   ├── core/            # Config, DB, Security, Dependencies
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── repositories/    # Data access layer (Generic BaseRepo)
│   │   ├── services/        # Business logic
│   │   └── parsers/         # Document parsers (PDF, DOCX, XLSX)
│   ├── requirements.txt
│   ├── seed.py
│   └── start.py
└── frontend/
    └── src/
        ├── pages/           # 9 full pages
        ├── components/      # Layout, UI, Charts, Forms
        ├── api/             # Axios API clients per domain
        ├── store/           # Zustand auth state
        └── hooks/           # Custom React hooks
```

---

## 📄 Pages

| Page | Path | Description |
|------|------|-------------|
| Login | `/login` | JWT authentication |
| Dashboard | `/dashboard` | KPI cards, charts, top defaulters |
| Residents | `/residents` | CRUD with contacts, status |
| Resident Detail | `/residents/:id` | Payment history, transactions |
| Transactions | `/transactions` | Income/expense log, CSV export |
| Documents | `/documents` | Upload PDF/DOCX/XLSX, parse & import |
| Payments | `/payments` | Monthly schedule, mark paid, overdue |
| Alerts | `/alerts` | Overdue alerts, resolve workflow |
| Reports | `/reports` | Monthly summary, collection, expenses |
| Audit Logs | `/audit-logs` | Full activity trail |
| Settings | `/settings` | Society config, user management |

---

## 🔒 Security

- **JWT Bearer token** authentication (30-min access + 7-day refresh)
- **bcrypt** password hashing
- **Rate limiting** on auth endpoints (slowapi)
- **CORS** whitelist (localhost:5173, localhost:3000)
- **SQL injection prevention** via SQLAlchemy ORM
- **File upload validation** (type + size limits)
- **Role-based access**: admin > manager > viewer
- **Audit trail** on all CREATE/UPDATE/DELETE operations

---

## 🧩 SOLID Principles

| Principle | Implementation |
|-----------|---------------|
| **S** — Single Responsibility | Each service class has one job (ResidentService, PaymentService, etc.) |
| **O** — Open/Closed | `AbstractParser` base class; extend for new file types |
| **L** — Liskov | All repositories extend `BaseRepository[T]` |
| **I** — Interface Segregation | Separate read/write repository interfaces |
| **D** — Dependency Inversion | FastAPI `Depends()` injection everywhere |

---

## 📁 Document Parsing

Upload files and auto-extract transactions:

| Format | Parser | Method |
|--------|--------|--------|
| **PDF** | pdfplumber | Table extraction → line-by-line fallback |
| **DOCX** | python-docx | Paragraph + table scanning |
| **XLSX** | openpyxl | Smart column header matching |

Expected XLSX columns (case-insensitive): `date`, `amount`, `type`, `category`, `description`, `reference`, `unit`

---

## 🗄️ Database Models

| Model | Key Fields |
|-------|-----------|
| User | username, email, hashed_password, role |
| Resident | unit_number, owner_name, phone, email, ownership_type |
| Transaction | date, amount, type (income/expense), category, resident_id |
| Payment | resident_id, month (YYYY-MM), due_amount, paid_amount, status |
| Document | filename, file_type, parsed, parsed_count |
| Alert | alert_type, severity, is_resolved, resident_id |
| AuditLog | user, action, entity_type, old_values, new_values |

---

## ⚙️ Environment Variables (backend/.env)

```env
SECRET_KEY=your-secret-key-here-change-in-production
DATABASE_URL=sqlite:///./maintenance_tracker.db
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
DEFAULT_MAINTENANCE_AMOUNT=3000
DEFAULT_DUE_DATE_DAY=5
PENALTY_RATE=0.02
```

---

## 🔧 Development Commands

```powershell
# Backend - run with auto-reload
py -3 -m uvicorn app.main:app --reload --port 8000

# Backend - reset & re-seed database
py -3 seed.py

# Frontend - dev server
npm run dev

# Frontend - production build
npm run build
```

---

## 📊 API Documentation

Interactive Swagger UI available at: **http://localhost:8000/docs**

Key endpoint groups:
- `/api/v1/auth` — Login, logout
- `/api/v1/residents` — Resident CRUD + payment/transaction history
- `/api/v1/transactions` — Transaction CRUD + filtering
- `/api/v1/payments` — Payment tracking + generate monthly + check overdue
- `/api/v1/documents` — Upload + parse + import
- `/api/v1/alerts` — Alert list + resolve
- `/api/v1/dashboard` — KPI summary, trends, defaulters
- `/api/v1/reports` — Monthly, collection, expense reports
- `/api/v1/audit` — Full audit log (admin only)
