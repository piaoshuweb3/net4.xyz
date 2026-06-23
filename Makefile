# net4.xyz Makefile
# Common development commands

# Colors
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m

# Default target
.PHONY: help
help:
	@echo ""
	@echo -e "$(BLUE)=== net4.xyz Development Commands ===$(NC)"
	@echo ""
	@echo -e "$(GREEN)Development Setup:$(NC)"
	@echo "  make setup              - Set up development environment"
	@echo "  make install            - Install all dependencies"
	@echo ""
	@echo -e "$(GREEN)Running Services:$(NC)"
	@echo "  make dev                - Start all services in development mode"
	@echo "  make dev:docker         - Start Docker services only"
	@echo "  make dev:node           - Start Node.js services only"
	@echo "  make dev:contracts      - Start Hardhat node"
	@echo ""
	@echo -e "$(GREEN)Building:$(NC)"
	@echo "  make build              - Build all packages"
	@echo "  make build:contracts    - Build smart contracts"
	@echo "  make build:backend      - Build backend"
	@echo "  make build:frontend     - Build frontend"
	@echo "  make build:ai           - Build AI engine"
	@echo ""
	@echo -e "$(GREEN)Testing:$(NC)"
	@echo "  make test               - Run all tests"
	@echo "  make test:contracts     - Run contract tests"
	@echo "  make test:backend       - Run backend tests"
	@echo "  make test:frontend      - Run frontend tests"
	@echo "  make test:ai            - Run AI engine tests"
	@echo ""
	@echo -e "$(GREEN)Linting & Formatting:$(NC)"
	@echo "  make lint               - Run all linters"
	@echo "  make format             - Format all code"
	@echo ""
	@echo -e "$(GREEN)Docker:$(NC)"
	@echo "  make docker:up          - Start all Docker services"
	@echo "  make docker:down        - Stop all Docker services"
	@echo "  make docker:build       - Build all Docker images"
	@echo "  make docker:logs        - View Docker logs"
	@echo ""
	@echo -e "$(GREEN)Cleaning:$(NC)"
	@echo "  make clean              - Clean all build artifacts"
	@echo "  make clean:docker       - Clean Docker volumes"
	@echo ""
	@echo -e "$(GREEN)Utilities:$(NC)"
	@echo "  make env                - Copy .env.example to .env"
	@echo "  make doctor             - Check development environment"
	@echo ""

# ===================
# Development Setup
# ===================

.PHONY: setup
setup:
	@echo -e "$(YELLOW)Setting up development environment...$(NC)"
	@chmod +x scripts/setup-dev-env.sh
	@./scripts/setup-dev-env.sh

.PHONY: install
install:
	@echo -e "$(YELLOW)Installing dependencies...$(NC)"
	@pnpm install

# ===================
# Running Services
# ===================

.PHONY: dev
dev:
	@echo -e "$(YELLOW)Starting all services...$(NC)"
	@pnpm -r --parallel dev

.PHONY: dev:docker
dev:docker:
	@echo -e "$(YELLOW)Starting Docker services...$(NC)"
	@docker-compose -f docker/docker-compose.dev.yml up

.PHONY: dev:node
dev:node:
	@echo -e "$(YELLOW)Starting Node.js services...$(NC)"
	@pnpm -r --parallel dev

.PHONY: dev:contracts
dev:contracts:
	@echo -e "$(YELLOW)Starting Hardhat node...$(NC)"
	@cd packages/contracts && pnpm run node

# ===================
# Building
# ===================

.PHONY: build
build:
	@echo -e "$(YELLOW)Building all packages...$(NC)"
	@pnpm -r build

.PHONY: build:contracts
build:contracts:
	@echo -e "$(YELLOW)Building smart contracts...$(NC)"
	@cd packages/contracts && pnpm run build

.PHONY: build:backend
build:backend:
	@echo -e "$(YELLOW)Building backend...$(NC)"
	@cd packages/backend && pnpm run build

.PHONY: build:frontend
build:frontend:
	@echo -e "$(YELLOW)Building frontend...$(NC)"
	@cd packages/frontend && pnpm run build

.PHONY: build:ai
build:ai:
	@echo -e "$(YELLOW)Building AI engine...$(NC)"
	@cd packages/ai-engine && pnpm run build

# ===================
# Testing
# ===================

.PHONY: test
test:
	@echo -e "$(YELLOW)Running all tests...$(NC)"
	@pnpm -r test

.PHONY: test:contracts
test:contracts:
	@echo -e "$(YELLOW)Running contract tests...$(NC)"
	@cd packages/contracts && pnpm run test

.PHONY: test:forge
test:forge:
	@echo -e "$(YELLOW)Running Forge tests...$(NC)"
	@cd packages/contracts && pnpm run test:forge

.PHONY: test:backend
test:backend:
	@echo -e "$(YELLOW)Running backend tests...$(NC)"
	@cd packages/backend && pnpm run test

.PHONY: test:frontend
test:frontend:
	@echo -e "$(YELLOW)Running frontend tests...$(NC)"
	@cd packages/frontend && pnpm run test

.PHONY: test:ai
test:ai:
	@echo -e "$(YELLOW)Running AI engine tests...$(NC)"
	@cd packages/ai-engine && pnpm run test

# ===================
# Linting & Formatting
# ===================

.PHONY: lint
lint:
	@echo -e "$(YELLOW)Running linters...$(NC)"
	@pnpm -r lint

.PHONY: format
format:
	@echo -e "$(YELLOW)Formatting code...$(NC)"
	@pnpm -r format

# ===================
# Docker
# ===================

.PHONY: docker:up
docker:up:
	@echo -e "$(YELLOW)Starting Docker services...$(NC)"
	@docker-compose -f docker/docker-compose.dev.yml up -d

.PHONY: docker:down
docker:down:
	@echo -e "$(YELLOW)Stopping Docker services...$(NC)"
	@docker-compose -f docker/docker-compose.dev.yml down

.PHONY: docker:build
docker:build:
	@echo -e "$(YELLOW)Building Docker images...$(NC)"
	@docker-compose -f docker/docker-compose.dev.yml build

.PHONY: docker:logs
docker:logs:
	@docker-compose -f docker/docker-compose.dev.yml logs -f

# ===================
# Cleaning
# ===================

.PHONY: clean
clean:
	@echo -e "$(YELLOW)Cleaning build artifacts...$(NC)"
	@pnpm -r clean

.PHONY: clean:docker
clean:docker:
	@echo -e "$(YELLOW)Cleaning Docker volumes...$(NC)"
	@docker-compose -f docker/docker-compose.dev.yml down -v

# ===================
# Utilities
# ===================

.PHONY: env
env:
	@if [ ! -f .env ]; then \
		echo -e "$(YELLOW)Creating .env file...$(NC)"; \
		cp .env.example .env; \
		echo -e "$(GREEN).env file created. Please edit it with your configuration.$(NC)"; \
	else \
		echo -e "$(YELLOW).env already exists.$(NC)"; \
	fi

.PHONY: env:prod
env:prod:
	@if [ ! -f .env ]; then \
		echo -e "$(YELLOW)Creating production .env file...$(NC)"; \
		cp .env.production.example .env; \
		echo -e "$(GREEN).env file created. Please edit it with your production configuration.$(NC)"; \
	else \
		echo -e "$(YELLOW).env already exists.$(NC)"; \
	fi

.PHONY: doctor
doctor:
	@echo ""
	@echo -e "$(BLUE)=== Development Environment Check ===$(NC)"
	@echo ""
	@echo "Node.js:"
	@node --version 2>/dev/null || echo "  Not installed"
	@echo "pnpm:"
	@pnpm --version 2>/dev/null || echo "  Not installed"
	@echo "Python:"
	@python3 --version 2>/dev/null || echo "  Not installed"
	@echo "Docker:"
	@docker --version 2>/dev/null || echo "  Not installed"
	@echo "Docker Compose:"
	@docker-compose --version 2>/dev/null || docker compose version 2>/dev/null || echo "  Not installed"
	@echo "Foundry:"
	@forge --version 2>/dev/null || echo "  Not installed"
	@echo ""
	@echo -e "$(GREEN)Check complete!$(NC)"

# ===================
# Production Deployment
# ===================

.PHONY: prod:build
prod:build:
	@echo -e "$(YELLOW)Building production Docker images...$(NC)"
	@docker build -t net4xyz/backend:latest ./packages/backend
	@docker build -t net4xyz/ai-engine:latest ./packages/ai-engine

.PHONY: prod:start
prod:start:
	@echo -e "$(YELLOW)Starting production services...$(NC)"
	@docker compose -f docker/docker-compose.prod.yml up -d

.PHONY: prod:stop
prod:stop:
	@echo -e "$(YELLOW)Stopping production services...$(NC)"
	@docker compose -f docker/docker-compose.prod.yml down

.PHONY: prod:restart
prod:restart:
	@echo -e "$(YELLOW)Restarting production services...$(NC)"
	@docker compose -f docker/docker-compose.prod.yml restart

.PHONY: prod:logs
prod:logs:
	@docker compose -f docker/docker-compose.prod.yml logs -f

.PHONY: prod:status
prod:status:
	@docker compose -f docker/docker-compose.prod.yml ps

.PHONY: prod:deploy
prod:deploy: prod:build prod:start
	@echo -e "$(GREEN)Production deployment complete!$(NC)"

# ===================
# Diagnostic Commands
# ===================

.PHONY: diagnose
diagnose:
	@echo -e "$(YELLOW)Running diagnostic...$(NC)"
	@bash scripts/diagnose-services.sh

.PHONY: diagnose:docker
diagnose:docker:
	@echo -e "$(YELLOW)Diagnosing Docker services...$(NC)"
	@docker-compose -f docker/docker-compose.dev.yml ps
	@docker-compose -f docker/docker-compose.dev.yml logs --tail=50

.PHONY: diagnose:backend
diagnose:backend:
	@echo -e "$(YELLOW)Diagnosing backend...$(NC)"
	@cd packages/backend && pnpm run build

.PHONY: diagnose:frontend
diagnose:frontend:
	@echo -e "$(YELLOW)Diagnosing frontend...$(NC)"
	@cd packages/frontend && pnpm run build

.PHONY: start:service
start:service:
	@echo -e "$(YELLOW)Starting individual service...$(NC)"
	@bash scripts/start-service.sh

.PHONY: quick-start
quick-start:
	@echo -e "$(YELLOW)Quick start menu...$(NC)"
	@bash scripts/quick-start.sh