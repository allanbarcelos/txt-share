.DEFAULT_GOAL := help
.PHONY: help install dev dev-api dev-app build up down logs restart clean test test-ci e2e e2e-open e2e-ci

# ─── Colors ───────────────────────────────────────────────────────────────────
RESET  := \033[0m
BOLD   := \033[1m
GREEN  := \033[32m
YELLOW := \033[33m
CYAN   := \033[36m

# ─── Help ─────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "$(BOLD)TXT-Share — available commands$(RESET)"
	@echo ""
	@echo "  $(CYAN)Development$(RESET)"
	@echo "    $(GREEN)make install$(RESET)      Install all dependencies (app + api)"
	@echo "    $(GREEN)make dev$(RESET)          Run API + Angular in parallel (requires tmux or runs sequentially)"
	@echo "    $(GREEN)make dev-api$(RESET)      Run API only with nodemon"
	@echo "    $(GREEN)make dev-app$(RESET)      Run Angular dev server"
	@echo ""
	@echo "  $(CYAN)Docker$(RESET)"
	@echo "    $(GREEN)make up$(RESET)           Start all services with docker compose (dev overrides)"
	@echo "    $(GREEN)make up-prod$(RESET)      Start all services without dev overrides (production)"
	@echo "    $(GREEN)make down$(RESET)         Stop and remove containers"
	@echo "    $(GREEN)make restart$(RESET)      Restart all containers"
	@echo "    $(GREEN)make build$(RESET)        Rebuild Docker images"
	@echo "    $(GREEN)make logs$(RESET)         Follow logs from all containers"
	@echo "    $(GREEN)make logs-api$(RESET)     Follow API container logs"
	@echo "    $(GREEN)make logs-app$(RESET)     Follow app (nginx) container logs"
	@echo ""
	@echo "  $(CYAN)Quality$(RESET)"
	@echo "    $(GREEN)make test$(RESET)         Run Angular unit tests (watch mode)"
	@echo "    $(GREEN)make test-ci$(RESET)      Run Angular unit tests headless (CI)"
	@echo "    $(GREEN)make e2e$(RESET)          Run Cypress E2E tests headless (app must be running)"
	@echo "    $(GREEN)make e2e-open$(RESET)     Open Cypress interactive runner"
	@echo "    $(GREEN)make e2e-ci$(RESET)       Start dev server + run E2E headless (CI)"
	@echo "    $(GREEN)make lint$(RESET)         Run Angular linter"
	@echo ""
	@echo "  $(CYAN)Utilities$(RESET)"
	@echo "    $(GREEN)make clean$(RESET)        Remove containers, volumes, images and node_modules"
	@echo "    $(GREEN)make status$(RESET)       Show running containers"
	@echo "    $(GREEN)make health$(RESET)       Check API health endpoint"
	@echo ""

# ─── Dependencies ─────────────────────────────────────────────────────────────
install:
	@echo "$(YELLOW)Installing API dependencies...$(RESET)"
	cd api && npm install
	@echo "$(YELLOW)Installing app dependencies...$(RESET)"
	cd app && npm install
	@echo "$(GREEN)Done.$(RESET)"

# ─── Local development (no Docker) ────────────────────────────────────────────
dev-api:
	@echo "$(YELLOW)Starting API (nodemon)...$(RESET)"
	cd api && npm run dev

dev-app:
	@echo "$(YELLOW)Starting Angular dev server...$(RESET)"
	cd app && npm start

dev:
	@echo "$(YELLOW)Starting API + Angular concurrently...$(RESET)"
	@if command -v concurrently > /dev/null 2>&1; then \
		concurrently \
			--names "API,APP" \
			--prefix-colors "cyan,green" \
			"cd api && npm run dev" \
			"cd app && npm start"; \
	else \
		echo "$(YELLOW)Tip: install 'concurrently' globally for a better experience:$(RESET)"; \
		echo "  npm install -g concurrently"; \
		echo ""; \
		echo "$(YELLOW)Starting API in background, then Angular...$(RESET)"; \
		cd api && npm run dev & \
		cd app && npm start; \
	fi

# ─── Docker ───────────────────────────────────────────────────────────────────
up:
	@echo "$(YELLOW)Starting services (dev mode)...$(RESET)"
	@[ -f .env ] || cp .env.example .env
	docker compose up --build

up-detach:
	@echo "$(YELLOW)Starting services in background...$(RESET)"
	@[ -f .env ] || cp .env.example .env
	docker compose up --build -d
	@echo "$(GREEN)Services started. Run 'make logs' to follow output.$(RESET)"

up-prod:
	@echo "$(YELLOW)Starting services (production, no overrides)...$(RESET)"
	@[ -f .env ] || cp .env.example .env
	docker compose -f docker-compose.yml up --build -d

down:
	@echo "$(YELLOW)Stopping services...$(RESET)"
	docker compose down

restart:
	@echo "$(YELLOW)Restarting services...$(RESET)"
	docker compose restart

build:
	@echo "$(YELLOW)Building Docker images...$(RESET)"
	docker compose build --no-cache

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f txt-share-api

logs-app:
	docker compose logs -f txt-share

status:
	docker compose ps

health:
	@echo "$(YELLOW)Checking API health...$(RESET)"
	@curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null \
		|| curl -s http://localhost:3000/health \
		|| echo "$(YELLOW)API not reachable on port 3000$(RESET)"

# ─── Quality ──────────────────────────────────────────────────────────────────
test:
	@echo "$(YELLOW)Running Angular unit tests (watch)...$(RESET)"
	cd app && npm test

test-ci:
	@echo "$(YELLOW)Running Angular unit tests (headless)...$(RESET)"
	cd app && npm run test:ci

e2e:
	@echo "$(YELLOW)Running Cypress E2E tests (app must be running on :4200)...$(RESET)"
	cd app && npm run e2e

e2e-open:
	@echo "$(YELLOW)Opening Cypress interactive runner...$(RESET)"
	cd app && npm run e2e:open

e2e-ci:
	@echo "$(YELLOW)Starting Angular dev server + running E2E tests...$(RESET)"
	cd app && npx concurrently \
		--kill-others \
		--success first \
		--names "APP,E2E" \
		"npm start" \
		"npx wait-on http://localhost:4200 && npm run e2e:ci"

lint:
	@echo "$(YELLOW)Running Angular linter...$(RESET)"
	cd app && npx ng lint

# ─── Cleanup ──────────────────────────────────────────────────────────────────
clean:
	@echo "$(YELLOW)Stopping and removing containers and volumes...$(RESET)"
	docker compose down -v --remove-orphans
	@echo "$(YELLOW)Removing Docker images...$(RESET)"
	docker image rm txt-share-txt-share txt-share-txt-share-api 2>/dev/null || true
	@echo "$(YELLOW)Removing node_modules...$(RESET)"
	rm -rf api/node_modules app/node_modules
	@echo "$(GREEN)Clean complete.$(RESET)"
