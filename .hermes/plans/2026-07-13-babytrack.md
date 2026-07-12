# BabyTrack Implementation Plan

> **For Hermes:** Use full-project-builds-with-claude-code skill to implement this plan in phased dispatches via Claude Code.

**Goal:** Build a complete baby activity tracking web app (Go + React + PostgreSQL)

**Architecture:** Go backend (Gin) with REST API + embedded React frontend (Vite + TypeScript + Tailwind). PostgreSQL for persistence. JWT auth. Single-binary deployment.

**Tech Stack:** Go 1.22, Gin, pgx/v5, bcrypt, jwt-go; React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Recharts, Radix UI primitives

---

## Phase 1: Backend — Database, Models, Repository (Tasks 1-6)

### Task 1: Project scaffolding + go.mod
- Create `backend/go.mod` (module: github.com/vitalivu992/babytrack)
- Go 1.22, dependencies: github.com/gin-gonic/gin, github.com/jackc/pgx/v5, github.com/golang-jwt/jwt/v5, github.com/joho/godotenv, golang.org/x/crypto, github.com/google/uuid
- Create `backend/cmd/server/main.go` (minimal Gin server, health check at /healthz)

### Task 2: Config + DB connection pool
- `backend/internal/config/config.go` — load env vars (PORT, DB_URL, JWT_SECRET, ENV)
- `backend/internal/repository/db.go` — pgxpool.New(), return *pgxpool.Pool
- Global error handling in main.go

### Task 3: Database migrations
- `backend/internal/migrations/001_init.sql` — tables: users, children, child_users, activity_logs, measurements, vaccinations, reminders, invitations
- Schema:
  ```sql
  users (id UUID PK, email TEXT UNIQUE, password_hash TEXT, name TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
  children (id UUID PK, name TEXT, birth_date DATE, gender TEXT, photo_url TEXT, blood_type TEXT, allergies TEXT, notes TEXT, owner_id UUID FK, created_at, updated_at)
  child_users (child_id UUID FK, user_id UUID FK, role TEXT CHECK(owner/editor/viewer), invited_at, PRIMARY KEY(child_id, user_id))
  activity_logs (id UUID PK, child_id UUID FK, user_id UUID FK, type TEXT, data JSONB, timestamp TIMESTAMPTZ, note TEXT, created_at)
  measurements (id UUID PK, child_id UUID FK, type TEXT, value DECIMAL, unit TEXT, measured_at DATE, note TEXT, created_at)
  vaccinations (id UUID PK, child_id UUID FK, vaccine_name TEXT, scheduled_date DATE, administered_date DATE, lot_number TEXT, note TEXT, created_at)
  reminders (id UUID PK, child_id UUID FK, user_id UUID FK, title TEXT, cron TEXT, enabled BOOL, created_at)
  invitations (id UUID PK, child_id UUID FK, email TEXT, role TEXT, token TEXT UNIQUE, expires_at, accepted_at)
  ```
- Create indexes on child_id columns

### Task 4: Models
- `backend/internal/models/user.go` — User struct
- `backend/internal/models/child.go` — Child struct
- `backend/internal/models/activity_log.go` — ActivityLog struct with flexible JSONB Data field
- `backend/internal/models/measurement.go` — Measurement struct
- `backend/internal/models/vaccination.go` — Vaccination struct
- `backend/internal/models/reminder.go` — Reminder struct
- `backend/internal/models/invitation.go` — Invitation struct
- All use uuid.UUID, time.Time, json tags

### Task 5: Repository (DB queries)
- `backend/internal/repository/user_repo.go` — CreateUser, GetUserByEmail, GetUserByID
- `backend/internal/repository/child_repo.go` — CreateChild, GetChildByID, GetChildrenByUserID, UpdateChild, DeleteChild
- `backend/internal/repository/activity_repo.go` — CreateLog, GetLogsByChild, GetLogsByChildAndType, DeleteLog
- `backend/internal/repository/measurement_repo.go` — CRUD
- `backend/internal/repository/vaccination_repo.go` — CRUD + GetUpcoming
- `backend/internal/repository/reminder_repo.go` — CRUD
- `backend/internal/repository/invitation_repo.go` — Create, GetByToken, MarkAccepted, GetByChild
- `backend/internal/repository/child_user_repo.go` — Grant, Revoke, GetUsersByChild, GetRole
- All use context.Context and *pgxpool.Pool

### Task 6: Services (business logic)
- `backend/internal/services/auth_service.go` — Register, Login, GenerateJWT, ValidateJWT, hashPassword, verifyPassword
- `backend/internal/services/child_service.go` — Create + share logic (auto-owner, invite flow)
- `backend/internal/services/activity_service.go` — Log creation with validation, daily/weekly summaries
- `backend/internal/services/insights_service.go` — Feeding totals, sleep totals, growth trends, daily summary
- `backend/internal/services/share_service.go` — Invite by email, accept, revoke, role checks
- `backend/internal/services/vaccination_service.go` — Auto-generate schedule based on DOB (WHO schedules)

### Task 7: Middleware
- `backend/internal/middleware/auth.go` — JWT validation, inject user_id into context
- `backend/internal/middleware/cors.go` — CORS handling (dev: permissive, prod: same-origin)
- `backend/internal/middleware/ratelimit.go` — Simple IP-based rate limiter (100 req/min)
- `backend/internal/middleware/security.go` — Security headers
- `backend/internal/middleware/child_access.go` — Check user has access to child (role-based)

### Task 8: Handlers (HTTP)
- `backend/internal/handlers/auth_handler.go` — POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
- `backend/internal/handlers/child_handler.go` — CRUD children, GET list, POST, PATCH, DELETE
- `backend/internal/handlers/activity_handler.go` — POST logs, GET logs (with filters: type, date range), DELETE log
- `backend/internal/handlers/measurement_handler.go` — CRUD measurements
- `backend/internal/handlers/vaccination_handler.go` — GET, PATCH (mark administered), GET upcoming
- `backend/internal/handlers/share_handler.go` — POST invite, POST accept, GET members, DELETE member
- `backend/internal/handlers/insights_handler.go` — GET daily summary, GET weekly summary, GET feeding stats, GET sleep stats, GET growth chart data
- `backend/internal/handlers/reminder_handler.go` — CRUD reminders
- `backend/internal/handlers/response.go` — JSONResponse helpers (success, error)
- Set up router in `cmd/server/main.go` wiring all handlers + middleware

## Phase 2: Frontend (Tasks 9-18)

### Task 9: Frontend scaffolding
- `frontend/package.json` — deps: react, react-dom, react-router-dom, @tanstack/react-query, recharts, @radix-ui/react-dialog, @radix-ui/react-select, @radix-ui/react-tabs, @radix-ui/react-toast, date-fns, axios, clsx, tailwind-merge
- Dev deps: vite, @vitejs/plugin-react, typescript, tailwindcss, postcss, autoprefixer, @types/react, @types/react-dom
- `frontend/vite.config.ts` — Vite config with proxy to :8080 for /api
- `frontend/tsconfig.json` — strict mode
- `frontend/tailwind.config.js` — content, theme (pastel colors, soft palette)
- `frontend/postcss.config.js`
- `frontend/index.html`
- `frontend/src/main.tsx` — React entry with QueryClient + Router

### Task 10: API client + types
- `frontend/src/api/client.ts` — Axios instance with base URL + auth interceptor (cookie-based or bearer)
- `frontend/src/api/types.ts` — TypeScript interfaces matching backend models (User, Child, ActivityLog, Measurement, Vaccination, Reminder, Invitation)
- `frontend/src/api/auth.ts` — register, login, getMe functions
- `frontend/src/api/children.ts` — CRUD children
- `frontend/src/api/activities.ts` — CRUD activities
- `frontend/src/api/measurements.ts` — CRUD
- `frontend/src/api/vaccinations.ts` — CRUD + upcoming
- `frontend/src/api/sharing.ts` — invite, accept, members, revoke
- `frontend/src/api/insights.ts` — daily/weekly summaries, feeding/sleep/growth stats
- `frontend/src/api/reminders.ts` — CRUD

### Task 11: Core UI components
- `frontend/src/lib/utils.ts` — cn() helper (clsx + tailwind-merge)
- `frontend/src/components/Button.tsx` — variants: primary, secondary, ghost, danger; sizes: sm, md, lg
- `frontend/src/components/Input.tsx` — text input with label
- `frontend/src/components/Select.tsx` — Radix select wrapper
- `frontend/src/components/Modal.tsx` — Radix dialog wrapper
- `frontend/src/components/Card.tsx` — card container
- `frontend/src/components/Tabs.tsx` — Radix tabs wrapper
- `frontend/src/components/Toast.tsx` — Radix toast + provider
- `frontend/src/components/Avatar.tsx` — child photo / initials
- `frontend/src/components/Layout.tsx` — main layout with bottom nav (mobile) + sidebar (desktop)
- `frontend/src/components/ProtectedRoute.tsx` — auth guard

### Task 12: Auth pages
- `frontend/src/pages/Login.tsx` — email + password form, redirect to dashboard
- `frontend/src/pages/Register.tsx` — name, email, password, confirm
- Handle loading/error states, toast on error

### Task 13: Onboarding + Dashboard
- `frontend/src/pages/Onboarding.tsx` — Add first child (name, DOB, gender, photo URL optional)
- `frontend/src/pages/Dashboard.tsx` — current child selector, today's summary cards (feedings, diapers, sleep total), quick log buttons (one-tap presets), recent activity feed (last 5 logs)
- Floating "+" action button opening log modal

### Task 14: Log activity (core loop)
- `frontend/src/pages/AddLog.tsx` or modal — tabs: Feeding, Diaper, Sleep, Measurement, Other
- Feeding form: type (breast/formula/solid/pumping), amount/duration, side, notes
- Diaper form: pee/poop/both, consistency picker (Bristol scale visual), color
- Sleep form: start/end time, type (night/nap), quick "put to sleep" / "woke up" buttons
- Measurement form: weight/height/head circumference, value, unit, date
- Medicine form: name, dose, time
- Other: custom quick logs (tummy time, bath, milestone, doctor visit)
- Quick presets: "Fed 120ml", "Poop + Pee", "Put to sleep" — one tap

### Task 15: Child profile + growth charts
- `frontend/src/pages/ChildProfile.tsx` — child info (editable), growth metrics dashboard, vaccination schedule, share management link
- `frontend/src/components/GrowthChart.tsx` — Recharts line chart with weight/height/head circumference over time + WHO percentile bands
- `frontend/src/components/VaccinationSchedule.tsx` — list of vaccines with scheduled/administered status, mark as given

### Task 16: Log history
- `frontend/src/pages/LogHistory.tsx` — timeline view of all logs, filter by type + date range, who logged it, delete option

### Task 17: Insights + sharing + settings
- `frontend/src/pages/Insights.tsx` — daily/weekly summary cards, feeding frequency chart, sleep totals chart, growth trend, export PDF button
- `frontend/src/pages/Share.tsx` — invite by email, list members with roles, revoke access
- `frontend/src/pages/Settings.tsx` — multiple children switcher, account info, logout
- `frontend/src/App.tsx` — all routes wired

## Phase 3: Integration (Tasks 18-20)

### Task 18: Makefile + Docker + go:embed
- `Makefile` with all targets (build, dev, run, test, docker, migrate)
- `backend/internal/embed.go` — go:embed frontend/dist
- Update main.go to serve embedded SPA (catch-all route for non-/api paths → index.html)
- `Dockerfile` — multi-stage: node build → go build → minimal runtime image
- `docker-compose.yml` — postgres + app
- `.env.example`
- `.gitignore`

### Task 19: README + final polish
- `README.md` — setup, build, run, API docs, docker instructions
- Verify all builds pass: `make build`
- Verify go test passes
- Verify frontend typechecks: `pnpm typecheck`
- Commit final work
