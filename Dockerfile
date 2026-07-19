# syntax=docker/dockerfile:1

# ---- Stage 1: build the React frontend with Vite ----
FROM node:20-bookworm-slim AS frontend
WORKDIR /app/frontend
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate
# Install deps first (cached unless lockfile changes)
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
# Build the SPA
COPY frontend/ ./
RUN pnpm build

# ---- Stage 2: build the Go backend (embeds the frontend) ----
FROM golang:1.22-bookworm AS backend
ENV GOTOOLCHAIN=local CGO_ENABLED=0
WORKDIR /app
# Cache module downloads
COPY backend/go.mod backend/go.sum ./backend/
RUN cd backend && go mod download
# Copy source
COPY backend/ ./backend/
# Place the compiled frontend where the go:embed directive expects it
COPY --from=frontend /app/frontend/dist ./backend/internal/frontend/dist
RUN cd backend && go build -trimpath -ldflags="-s -w" -o /out/babytrack ./cmd/server

# ---- Stage 3: minimal runtime image ----
FROM alpine:3.20 AS runtime
RUN apk add --no-cache wget ca-certificates tzdata && \
    adduser -D -u 65532 app
ENV PORT=8080 ENV=production TZ=Asia/Ho_Chi_Minh
WORKDIR /
COPY --from=backend /out/babytrack /babytrack
EXPOSE 8080
USER app
ENTRYPOINT ["/babytrack"]
