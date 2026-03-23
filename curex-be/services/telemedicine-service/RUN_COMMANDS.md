# Telemedicine Service Run Commands

## 1) Docker-only mode

Run from this folder:

```powershell
docker compose -f docker-compose.telemedicine.yml up -d --build
```

Check containers:

```powershell
docker compose -f docker-compose.telemedicine.yml ps
```

View logs:

```powershell
docker compose -f docker-compose.telemedicine.yml logs -f telemedicine-service
docker compose -f docker-compose.telemedicine.yml logs -f postgres-telemed
docker compose -f docker-compose.telemedicine.yml logs -f rabbitmq-telemed
```

Stop everything:

```powershell
docker compose -f docker-compose.telemedicine.yml down
```

Reset DB volume:

```powershell
docker compose -f docker-compose.telemedicine.yml down -v
```

## 2) Local Spring Boot + Docker infra mode

Start only infra:

```powershell
docker compose -f docker-compose.telemedicine.yml up -d postgres-telemed rabbitmq-telemed
```

Run service locally:

```powershell
mvn spring-boot:run
```

## 3) Useful URLs

- Swagger UI: http://localhost:8089/swagger-ui.html
- RabbitMQ UI: http://localhost:15673
- RabbitMQ credentials: admin / password

## 4) Optional integration mode with appointment-service

Set environment variable before running telemedicine service:

```powershell
$env:TELEMEDICINE_STUB_MODE="false"
$env:SERVICES_APPOINTMENT_URL="http://localhost:8088"
```
