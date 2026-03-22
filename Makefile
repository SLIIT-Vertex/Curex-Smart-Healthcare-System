FE_DIR := curex-fe
BE_DIR := curex-be

.DEFAULT_GOAL := help

.PHONY: help fe fe-install fe-dev fe-build fe-preview \
        be-build-auth be-run-auth \
        docker-up docker-down docker-logs

help:
	@echo "╔════════════════════════════════════════════════════════════╗"
	@echo "║              Curex Makefile Commands                       ║"
	@echo "╚════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "FRONTEND (React + Vite)"
	@echo "  make fe-install    Install frontend dependencies"
	@echo "  make fe            Start frontend dev server"
	@echo "  make fe-dev        Start frontend dev server (same as 'make fe')"
	@echo "  make fe-build      Build frontend for production"
	@echo "  make fe-preview    Preview production build"
	@echo ""
	@echo "BACKEND (Spring Boot Services)"
	@echo "  make be-build-auth      Build auth-service JAR"
	@echo "  make be-run-auth        Run auth-service locally (requires pom.xml)"
	@echo ""
	@echo "DOCKER COMPOSE"
	@echo "  make docker-up          Start all services (docker-compose up)"
	@echo "  make docker-down        Stop all services (docker-compose down)"
	@echo "  make docker-logs        View logs (docker-compose logs -f)"
	@echo ""
	@echo "See docs/DEVERLOPER_GUIDE.md for full documentation"

fe: fe-dev

fe-install:
	npm --prefix $(FE_DIR) install

fe-dev:
	npm --prefix $(FE_DIR) run dev

fe-build:
	npm --prefix $(FE_DIR) run build

fe-preview:
	npm --prefix $(FE_DIR) run preview

# ─── Backend Service Targets (Examples) ───
# Uncomment and copy these patterns for each service you add

be-build-auth:
	cd $(BE_DIR)/services/auth-service && mvn clean package -DskipTests

be-run-auth:
	cd $(BE_DIR)/services/auth-service && mvn spring-boot:run

# be-build-patient:
# 	cd $(BE_DIR)/services/patient-service && mvn clean package -DskipTests
#
# be-run-patient:
# 	cd $(BE_DIR)/services/patient-service && mvn spring-boot:run
#
# PATTERN: To add a new service, copy these lines and replace 'auth' with 'service-name':
# be-build-SERVICE_NAME:
# 	cd $(BE_DIR)/services/SERVICE_NAME && mvn clean package -DskipTests
#
# be-run-SERVICE_NAME:
# 	cd $(BE_DIR)/services/SERVICE_NAME && mvn spring-boot:run

# ─── Docker Targets ───

docker-up:
	docker-compose up --build

docker-up-bg:
	docker-compose up -d --build

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f
