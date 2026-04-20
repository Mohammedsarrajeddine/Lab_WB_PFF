.PHONY: help backend-install frontend-install backend-quality backend-integration frontend-quality ci docker-up docker-down

help:
	@echo "Available targets:"
	@echo "  backend-install      Install backend dependencies"
	@echo "  frontend-install     Install frontend dependencies"
	@echo "  backend-quality      Run backend lint, unit tests, and package build"
	@echo "  backend-integration  Run backend integration tests against the configured database"
	@echo "  frontend-quality     Run frontend format, lint, typecheck, tests, and build"
	@echo "  ci                   Run backend and frontend quality gates"
	@echo "  docker-up            Start the local stack"
	@echo "  docker-down          Stop the local stack"

backend-install:
	cd fastapi_app && python -m pip install -e ".[dev]"

frontend-install:
	cd frontend-pff-lab && npm ci

backend-quality:
	bash ./scripts/ci/backend-quality.sh

backend-integration:
	bash ./scripts/ci/backend-integration.sh

frontend-quality:
	bash ./scripts/ci/frontend-quality.sh

ci: backend-quality frontend-quality

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down
