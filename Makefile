# BabyTrack — build, dev, test, and docker orchestration.
#
# Go commands use GOTOOLCHAIN=local so the build never auto-downloads a
# different toolchain. pnpm is loaded via nvm (source ~/.nvm/nvm.sh).

SHELL := /bin/bash
export GOTOOLCHAIN := local
NVM := source ~/.nvm/nvm.sh

FRONTEND_DIR := frontend
BACKEND_DIR  := backend
EMBED_DIR    := $(BACKEND_DIR)/internal/frontend/dist
BIN          := $(BACKEND_DIR)/build/babytrack

.DEFAULT_GOAL := build
.PHONY: help build build-frontend build-backend sync-frontend run \
        dev dev-frontend dev-backend test test-backend typecheck \
        migrate docker docker-up docker-down clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

build: build-backend ## Build frontend + backend into a single binary

build-frontend: ## Build the React frontend (pnpm) -> frontend/dist
	cd $(FRONTEND_DIR) && $(NVM) && pnpm install --frozen-lockfile && pnpm build

# sync-frontend copies the Vite build output into the backend embed directory
# so `go:embed` picks it up at compile time.
sync-frontend: build-frontend
	@rm -rf $(EMBED_DIR)
	@mkdir -p $(EMBED_DIR)
	@cp -r $(FRONTEND_DIR)/dist/. $(EMBED_DIR)/
	@echo "synced frontend/dist -> $(EMBED_DIR)"

build-backend: sync-frontend ## Compile the Go binary (embeds the frontend)
	@mkdir -p $(BACKEND_DIR)/build
	cd $(BACKEND_DIR) && go build -o $(CURDIR)/$(BIN) ./cmd/server

run: build ## Run the compiled binary (port 8080)
	./$(BIN)

dev: dev-backend ## Run the backend (run dev-frontend separately for HMR)

dev-frontend: ## Start the Vite dev server on :5173 (proxies /api -> :8080)
	cd $(FRONTEND_DIR) && $(NVM) && pnpm dev

dev-backend: ## Run the Go backend on :8080 with live reload (air, falls back to go run)
	cd $(BACKEND_DIR) && (command -v air >/dev/null 2>&1 && air || go run ./cmd/server)

test: test-backend typecheck ## Run Go tests + frontend typecheck

test-backend: ## Run Go tests
	cd $(BACKEND_DIR) && go test ./...

typecheck: ## Typecheck the frontend
	cd $(FRONTEND_DIR) && $(NVM) && pnpm typecheck

migrate: ## Run embedded migrations against the configured DB (starts the binary once)
	$(MAKE) build
	./$(BIN)

docker: ## Build the Docker image
	docker build -t babytrack:latest .

docker-up: ## Start postgres + app via docker-compose
	docker compose up -d --build

docker-down: ## Stop docker-compose services
	docker compose down

clean: ## Remove build artifacts
	rm -rf $(FRONTEND_DIR)/dist $(BACKEND_DIR)/build $(EMBED_DIR)
	@mkdir -p $(EMBED_DIR) && touch $(EMBED_DIR)/.gitkeep
