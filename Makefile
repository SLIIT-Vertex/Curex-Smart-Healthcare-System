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
        docker-up docker-down docker-logs \
        k8s-build k8s-tag k8s-deploy k8s-status k8s-logs k8s-down \
        k8s-restart k8s-forward

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
	@echo "  make docker-clean-run   Clean and rebuild all services"
	@echo ""
	@echo "KUBERNETES"
	@echo "  make k8s-build          Build all Docker images"
	@echo "  make k8s-tag            Tag images for Kubernetes"
	@echo "  make k8s-deploy         Deploy full stack to K8s (build + tag + apply)"
	@echo "  make k8s-status         Show pod status"
	@echo "  make k8s-logs SVC=name  View logs for a service (e.g. make k8s-logs SVC=user-service)"
	@echo "  make k8s-restart SVC=n  Restart a deployment (e.g. make k8s-restart SVC=user-service)"
	@echo "  make k8s-forward        Port-forward API Gateway to localhost:8080"
	@echo "  make k8s-down           Delete all K8s resources"
	@echo ""

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

# ── Kubernetes Targets ──

SERVICES := user-service notification-service patient-service doctor-service \
            ai-symptom-service report-service payment-service api-gateway
NESTED_SERVICES := appointment-service telemedicine-service

k8s-build:
	docker compose build

k8s-tag:
	docker tag curex-smart-healthcare-system-user-service:latest curex-user-service:latest
	docker tag curex-smart-healthcare-system-notification-service:latest curex-notification-service:latest
	docker tag curex-smart-healthcare-system-patient-service:latest curex-patient-service:latest
	docker tag curex-smart-healthcare-system-doctor-service:latest curex-doctor-service:latest
	docker tag curex-smart-healthcare-system-ai-symptom-service:latest curex-ai-symptom-service:latest
	docker tag curex-smart-healthcare-system-report-service:latest curex-report-service:latest
	docker tag curex-smart-healthcare-system-payment-service:latest curex-payment-service:latest
	docker tag curex-smart-healthcare-system-appointment-service:latest curex-appointment-service:latest
	docker tag curex-smart-healthcare-system-telemedicine-service:latest curex-telemedicine-service:latest
	docker tag curex-smart-healthcare-system-api-gateway:latest curex-api-gateway:latest

k8s-deploy: k8s-build k8s-tag
	kubectl apply -k k8s/

k8s-status:
	kubectl get pods -n curex

k8s-logs:
	kubectl logs -f deployment/$(SVC) -n curex

k8s-restart:
	kubectl rollout restart deployment/$(SVC) -n curex

k8s-forward:
	kubectl port-forward service/api-gateway 8080:8080 -n curex

k8s-down:
	kubectl delete -k k8s/
