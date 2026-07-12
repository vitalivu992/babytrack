# BabyTrack

A baby activity tracking web app — feedings, diapers, sleep, growth, and vaccinations — built as a single self-contained binary (Go backend + embedded React frontend) backed by PostgreSQL.

- **Backend:** Go 1.22, [Gin](https://github.com/gin-gonic/gin), [pgx/v5](https://github.com/jackc/pgx), JWT auth, bcrypt.
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Radix UI primitives, TanStack Query, Recharts.
- **Deploy:** one binary serves the REST API (`/api/*`) and the embedded SPA on the same port.

---

## Quick start (Docker)

```bash
cp .env.example .env          # adjust secrets for production
make docker-up                # builds image, starts postgres + app
```

App: http://localhost:8080 · Postgres on `localhost:5432`.

```bash
make docker-down              # stop services
```

---

## Local development

### Prerequisites

- Go 1.22+ (`GOTOOLCHAIN=local` is set automatically by the Makefile)
- Node.js 20+ with [pnpm](https://pnpm.io) (loaded via `nvm`)
- PostgreSQL 16+ (or just use the docker-compose postgres)

### 1. Configure

```bash
cp .env.example .env
# set DB_URL, JWT_SECRET, etc.
```

### 2. Run the database

Either start a local Postgres, or just boot the compose database:

```bash
docker compose up -d postgres
```

### 3. Run frontend + backend in separate terminals

```bash
make dev-frontend    # Vite dev server on :5173 (HMR, proxies /api -> :8080)
make dev-backend     # Go server on :8080 (air live-reload if installed, else go run)
```

Open http://localhost:5173. API is proxied to the backend automatically.

---

## Build

```bash
make build           # build frontend, sync into backend, compile single binary
./backend/build/babytrack    # run it (port 8080)
```

The frontend is built by Vite into `frontend/dist`, copied to
`backend/internal/frontend/dist`, and embedded into the binary with `go:embed`.
The resulting binary needs no external static files.

---

## Makefile targets

| Target              | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `make build`        | Full build: frontend + backend → `backend/build/babytrack` |
| `make build-frontend` | `pnpm install` + `pnpm build` → `frontend/dist`          |
| `make build-backend`  | Sync frontend + `go build`                                |
| `make run`          | Build and run the binary (port 8080)                       |
| `make dev-frontend` | Vite dev server on :5173                                   |
| `make dev-backend`  | Go backend on :8080 (live reload via `air` if available)   |
| `make test`         | `go test ./...` + frontend typecheck                       |
| `make typecheck`    | `pnpm typecheck`                                           |
| `make migrate`      | Build + run the binary (migrations run automatically)      |
| `make docker`       | Build the Docker image                                     |
| `make docker-up`    | `docker compose up -d --build` (postgres + app)            |
| `make docker-down`  | Stop docker-compose services                               |
| `make clean`        | Remove build artifacts                                     |

---

## Configuration

All settings come from environment variables (`.env` is auto-loaded in dev).

| Variable      | Default | Description                                            |
| ------------- | ------- | ------------------------------------------------------ |
| `PORT`        | `8080`  | Server listen port                                     |
| `DB_URL`      | —       | PostgreSQL connection string (required)                |
| `JWT_SECRET`  | —       | JWT signing secret (required)                          |
| `ENV`         | `development` | `development` or `production` (controls CORS, gin mode) |
| `VITE_API_URL` | `/api` | Frontend API base URL (dev only; prod is same-origin) |

---

## Database schema & migrations

Migrations live in [`backend/internal/migrations/`](backend/internal/migrations) as forward-only SQL files and run **automatically on server startup**. The bookkeeping table `schema_migrations` tracks applied files.

Core tables: `users`, `children`, `child_users`, `activity_logs` (polymorphic JSONB `data`), `measurements`, `vaccinations`, `reminders`, `invitations`.

To apply migrations without the full app, just start the server once:

```bash
make migrate
```

---

## API reference

All responses use the envelope `{ "data": ... }` on success or `{ "error": "..." }` on failure. Auth uses a JWT stored in an `HttpOnly` cookie (24h expiry).

### Auth
| Method | Path                       | Auth | Description           |
| ------ | -------------------------- | ---- | --------------------- |
| POST   | `/api/auth/register`       | —    | Create account        |
| POST   | `/api/auth/login`          | —    | Login, set cookie     |
| GET    | `/api/auth/me`             | ✔    | Current user          |

### Children
| Method | Path                                  | Auth | Role    |
| ------ | ------------------------------------- | ---- | ------- |
| GET    | `/api/children`                       | ✔    | —       |
| POST   | `/api/children`                       | ✔    | —       |
| GET    | `/api/children/:child_id`             | ✔    | viewer  |
| PATCH  | `/api/children/:child_id`             | ✔    | editor  |
| DELETE | `/api/children/:child_id`             | ✔    | owner   |

### Activity logs
| Method | Path                                        | Role   |
| ------ | ------------------------------------------- | ------ |
| GET    | `/api/children/:child_id/logs`              | viewer |
| POST   | `/api/children/:child_id/logs`              | editor |
| DELETE | `/api/children/:child_id/logs/:id`          | editor |

### Measurements
| Method | Path                                              | Role   |
| ------ | ------------------------------------------------- | ------ |
| GET    | `/api/children/:child_id/measurements`            | viewer |
| POST   | `/api/children/:child_id/measurements`            | editor |
| PATCH  | `/api/children/:child_id/measurements/:id`        | editor |
| DELETE | `/api/children/:child_id/measurements/:id`        | editor |

### Vaccinations
| Method | Path                                                 | Role   |
| ------ | ---------------------------------------------------- | ------ |
| GET    | `/api/children/:child_id/vaccinations`               | viewer |
| GET    | `/api/children/:child_id/vaccinations/upcoming`      | viewer |
| GET    | `/api/children/:child_id/vaccinations/ensure`        | viewer |
| POST   | `/api/children/:child_id/vaccinations/schedule`      | editor |
| PATCH  | `/api/children/:child_id/vaccinations/:id`           | editor |
| DELETE | `/api/children/:child_id/vaccinations/:id`           | editor |

### Insights
| Method | Path                                        | Role   |
| ------ | ------------------------------------------- | ------ |
| GET    | `/api/children/:child_id/insights/daily`    | viewer |
| GET    | `/api/children/:child_id/insights/weekly`   | viewer |
| GET    | `/api/children/:child_id/insights/feeding`  | viewer |
| GET    | `/api/children/:child_id/insights/sleep`    | viewer |
| GET    | `/api/children/:child_id/insights/growth`   | viewer |

### Reminders
| Method | Path                                       | Role   |
| ------ | ------------------------------------------ | ------ |
| GET    | `/api/children/:child_id/reminders`        | viewer |
| POST   | `/api/children/:child_id/reminders`        | editor |
| PATCH  | `/api/children/:child_id/reminders/:id`    | editor |
| DELETE | `/api/children/:child_id/reminders/:id`    | editor |

### Sharing
| Method | Path                                          | Role  |
| ------ | --------------------------------------------- | ----- |
| POST   | `/api/invitations/accept`                     | ✔     |
| GET    | `/api/children/:child_id/members`             | viewer|
| POST   | `/api/children/:child_id/invitations`         | owner |
| DELETE | `/api/children/:child_id/members/:user_id`    | owner |

**Roles:** `owner` (full), `editor` (read/write logs), `viewer` (read-only).

---

## Project structure

```
babytrack/
├── backend/
│   ├── cmd/server/main.go              # Entry point: wiring + router
│   ├── internal/
│   │   ├── config/                     # Env config
│   │   ├── frontend/                   # go:embed of compiled SPA + SPA handler
│   │   ├── models/                     # Data structs
│   │   ├── repository/                 # pgx DB queries
│   │   ├── services/                   # Business logic
│   │   ├── handlers/                   # HTTP handlers (Gin)
│   │   ├── middleware/                 # auth, CORS, rate limit, security, access
│   │   └── migrations/                 # embedded SQL migrations
│   ├── go.mod / go.sum
│   └── build/                          # compiled binary (gitignored)
├── frontend/                           # React + Vite (built to dist/)
├── Dockerfile                          # multi-stage: node -> go -> distroless
├── docker-compose.yml                  # postgres + app
├── Makefile
└── .env.example
```

---

## Notes

- **Single binary:** the SPA is embedded via `go:embed`; no external static files needed at runtime.
- **SPA fallback:** non-API, non-health routes return `index.html` for client-side routing.
- **Security:** bcrypt (cost 10), JWT in `HttpOnly` cookie, rate limiting (100 req/min/IP), security headers, parameterized queries throughout.

---

## License

MIT
