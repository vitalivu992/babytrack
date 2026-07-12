# BabyTrack

## Architecture
- Go backend (Gin framework) with REST API
- PostgreSQL database (via pgx driver)
- React 18 frontend (Vite + TypeScript + Tailwind CSS + Radix primitives)
- Frontend embedded in Go binary via go:embed
- JWT authentication with bcrypt password hashing
- Clean architecture: handlers → services → repository

## Project Structure
```
babytrack/
├── backend/
│   ├── cmd/server/main.go         # Entry point
│   ├── internal/
│   │   ├── config/                # Env config
│   │   ├── models/                # Data models/structs
│   │   ├── repository/            # DB queries (pgx)
│   │   ├── services/              # Business logic
│   │   ├── handlers/              # HTTP handlers
│   │   ├── middleware/            # Auth, CORS, rate limiting
│   │   └── migrations/            # SQL migrations
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── src/
│   │   ├── api/                   # API client + types
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                # Route pages
│   │   ├── hooks/                # Custom hooks
│   │   ├── lib/                  # Utils, cn helper
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
├── Makefile
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

## Key Design Decisions
- Backend serves both API (/api/*) and embedded frontend on same port
- PostgreSQL for data storage (via pgx v5 connection pool)
- Activity logs use a polymorphic JSONB `data` column per log type
- WHO growth percentile data embedded as Go constants
- JWT tokens (24h expiry) stored in HttpOnly cookies
- Password hashing with bcrypt (cost 10)
- CORS enabled for dev, same-origin in prod (embedded frontend)
- Rate limiting: 100 req/min per IP
- Security headers: X-Frame-Options, X-Content-Type-Options, etc.

## Build Commands
- `make dev-frontend` — Vite dev server (port 5173)
- `make dev-backend` — Go backend with air/live reload (port 8080)
- `make build-frontend` — pnpm install + pnpm build → frontend/dist/
- `make build-backend` — go build → backend/build/babytrack
- `make build` — full build (frontend + backend)
- `make run` — run the final binary (port 8080)
- `make migrate` — run DB migrations
- `make test` — go test + frontend typecheck
- `make docker` — build Docker image
- `make docker-up` — docker-compose up (postgres + app)

## Code Standards
- Go: standard library conventions, context-aware functions, error wrapping
- React: functional components, hooks, TypeScript strict mode
- All API responses in JSON: `{ "data": ..., "error": ... }`
- REST conventions: GET /api/resources, POST /api/resources, etc.
- DB migrations are forward-only SQL files
- Use pgxpool for connection management
- All queries use parameterized args ($1, $2, etc.)

## Environment Variables
- `PORT` (default 8080) — server port
- `DB_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `ENV` (development/production) — runtime mode
- `VITE_API_URL` — frontend API base URL (dev only)

## Database Schema
Key tables: users, children, child_users, activity_logs (JSONB data), measurements, vaccinations, reminders, invitations

## Module Path
`github.com/vitalivu992/babytrack`
