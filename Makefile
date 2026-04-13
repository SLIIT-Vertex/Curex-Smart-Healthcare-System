FE_DIR := curex-fe
BE_DIR := curex-be

.DEFAULT_GOAL := help

.PHONY: help fe fe-install fe-dev fe-build fe-preview \
        be-build-auth be-run-auth be-build-gateway be-run-gateway \
        be-build-patient be-run-patient \
        be-build-doctor be-run-doctor \
        be-build-ai be-run-ai \
        be-build-report be-run-report \
        be-build-payment be-run-payment \
        be-build-notification be-run-notification \
        be-build-telemed be-run-telemed \
        be-build-appointment be-run-appointment \
        be-build-gateway be-run-gateway \
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
	@echo "  make be-build-gateway   Build API Gateway JAR"
	@echo "  make be-run-gateway     Run API Gateway locally (port 8080)"
	@echo "  make be-build-auth      Build auth-service JAR"
	@echo "  make be-run-auth        Run auth-service locally"
	@echo "  make be-build-patient   Build patient-service JAR (port 8083)"
	@echo "  make be-run-patient     Run patient-service locally"
	@echo "  make be-build-doctor    Build doctor-service JAR (port 8084)"
	@echo "  make be-run-doctor      Run doctor-service locally"
	@echo "  make be-build-ai        Build ai-symptom-service JAR (port 8085)"
	@echo "  make be-run-ai          Run ai-symptom-service locally"
	@echo "  make be-build-report    Build report-service JAR (port 8086)"
	@echo "  make be-run-report      Run report-service locally"
	@echo "  make be-build-payment   Build payment-service JAR (port 8087)"
	@echo "  make be-run-payment     Run payment-service locally"
	@echo "  make be-build-notification Build notification-service JAR (port 8082)"
	@echo "  make be-run-notification   Run notification-service locally"
	@echo "  make be-build-telemed   Build telemedicine-service JAR (port 8089)"
	@echo "  make be-run-telemed     Run telemedicine-service locally"
	@echo "  make be-build-appointment Build appointment-service JAR (port 8088)"
	@echo "  make be-run-appointment   Run appointment-service locally"
	@echo "  make be-build-gateway   Build api-gateway JAR (port 8080)"
	@echo "  make be-run-gateway     Run api-gateway locally"
	@echo ""
	@echo "DOCKER COMPOSE"
	@echo "  make docker-up          Start all services (docker-compose up)"
	@echo "  make docker-down        Stop all services (docker-compose down)"
	@echo "  make docker-logs        View logs (docker-compose logs -f)"
	@echo "  make docker-clean-run   Clean and rebuild all services (docker-compose down -v && docker-compose up --build)"
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

#  Backend Service Targets (Examples) 
# Uncomment and copy these patterns for each service you add

be-build-gateway:
	cd $(BE_DIR)/api-gateway && mvn clean package -DskipTests

be-run-gateway:
	cd $(BE_DIR)/api-gateway && mvn spring-boot:run

be-build-auth:
	cd $(BE_DIR)/services/user-service && mvn clean package -DskipTests

be-run-auth:
	cd $(BE_DIR)/services/user-service && mvn spring-boot:run

be-build-patient:
	cd $(BE_DIR)/services/patient-service && mvn clean package -DskipTests

be-run-patient:
	cd $(BE_DIR)/services/patient-service && mvn spring-boot:run

be-build-doctor:
	cd $(BE_DIR)/services/doctor-service && mvn clean package -DskipTests

be-run-doctor:
	cd $(BE_DIR)/services/doctor-service && mvn spring-boot:run

be-build-ai:
	cd $(BE_DIR)/services/ai-symptom-service && mvn clean package -DskipTests

be-run-ai:
	cd $(BE_DIR)/services/ai-symptom-service && mvn spring-boot:run

be-build-report:
	cd $(BE_DIR)/services/report-service && mvn clean package -DskipTests

be-run-report:
	cd $(BE_DIR)/services/report-service && mvn spring-boot:run

be-build-payment:
	cd $(BE_DIR)/services/payment-service && mvn clean package -DskipTests

be-run-payment:
	cd $(BE_DIR)/services/payment-service && mvn spring-boot:run

be-build-notification:
	cd $(BE_DIR)/services/notification-service && mvn clean package -DskipTests

be-run-notification:
	cd $(BE_DIR)/services/notification-service && mvn spring-boot:run

be-build-telemed:
	cd $(BE_DIR)/services/telemedicine-service && mvn clean package -DskipTests

be-run-telemed:
	cd $(BE_DIR)/services/telemedicine-service && mvn spring-boot:run

be-build-appointment:
	cd $(BE_DIR)/services/appointment/appointment-service && mvn clean package -DskipTests

be-run-appointment:
	cd $(BE_DIR)/services/appointment/appointment-service && mvn spring-boot:run

be-build-gateway:
	cd $(BE_DIR)/api-gateway && mvn clean package -DskipTests

be-run-gateway:
	cd $(BE_DIR)/api-gateway && mvn spring-boot:run

#  Docker Targets 

docker-up:
	docker-compose up --build

docker-up-bg:
	docker-compose up -d --build

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-clean-run:
	docker-compose down -v && docker-compose up --build
