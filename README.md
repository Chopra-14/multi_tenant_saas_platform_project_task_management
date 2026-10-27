# Multi‑Tenant SaaS Platform – Project & Task Management

## Overview

This repository contains a **production‑ready, Docker‑ized multi‑tenant SaaS application** that enables multiple organizations (tenants) to register, manage their teams, create projects, and track tasks. The system implements:
- Complete data isolation per tenant (shared database, `tenant_id` column)
- JWT‑based authentication with role‑based access control (Super Admin, Tenant Admin, User)
- Subscription plan limits (free / pro / enterprise)
- Full RESTful API (19 endpoints) with consistent `{success, message, data}` responses
- Responsive React frontend (registration, login, dashboard, project & task management, user management)
- Docker Compose setup that brings up PostgreSQL, backend, and frontend with a single command.

## Project Structure

```
├─ backend/                     # Node.js/Express API
│  ├─ src/                     # Application source
│  │  ├─ config/               # DB connection, env helpers
│  │  ├─ controllers/          # Route handlers
│  │  ├─ middleware/           # Auth, RBAC, error handling
│  │  ├─ models/               # DB models (Knex query helpers)
│  │  ├─ routes/               # Express routers (auth, tenants, users, projects, tasks)
│  │  └─ app.js                # Express app bootstrap
│  ├─ migrations/              # SQL migration files
│  ├─ seeds/                   # Seed data script
│  ├─ Dockerfile               # Multi‑stage build
│  └─ package.json
├─ frontend/                    # React UI (Vite)
│  ├─ src/
│  │  ├─ components/           # Shared UI components
│  │  ├─ pages/                # Page components (Register, Login, Dashboard, …)
│  │  ├─ api/                  # Centralised API service (axios)
│  │  └─ App.jsx
│  ├─ Dockerfile
│  └─ package.json
├─ docker-compose.yml           # Orchestrates DB, backend, frontend
├─ .env.example                 # Environment variable template
├─ docs/
│  ├─ research.md
│  ├─ PRD.md
│  ├─ architecture.md
│  ├─ technical-spec.md
│  └─ API.md
└─ submission.json              # Test credentials for automated evaluation
```

## Getting Started (Local Development)

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd <repo-dir>
   ```
2. **Create an `.env` file** (copy from `.env.example`) and adjust values if needed.
3. **Run Docker Compose**
   ```bash
   docker-compose up -d
   ```
   This will:
   - Start PostgreSQL on port **5432** (service name `database`).
   - Build and start the backend on port **5000** (service name `backend`).
   - Build and start the React frontend on port **3000** (service name `frontend`).
4. **Verify health**
   ```bash
   curl http://localhost:5000/api/health
   ```
   Expected response: `{ "status": "ok", "database": "connected" }`
5. Open the UI at `http://localhost:3000` and register a new tenant.

## Scripts

- **Backend**
  - `npm run dev` – starts Nodemon for development (inside container).
  - `npm run lint` – runs ESLint.
- **Frontend**
  - `npm run dev` – Vite dev server (inside container).
  - `npm run build` – production build.

## Deployment

The same `docker-compose.yml` works in production; just replace the `.env` with real secrets and optionally use a reverse proxy (NGINX) in front of the `frontend` service.

---

For detailed architecture, database schema, API documentation, and full project specifications, see the files under the `docs/` folder.
