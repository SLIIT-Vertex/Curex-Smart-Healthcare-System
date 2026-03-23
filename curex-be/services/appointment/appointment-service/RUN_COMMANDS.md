# Appointment Service Run Commands

This file contains the commands you need to run, check, and troubleshoot the appointment service.

## 1) Docker-only mode (recommended)

Run from this folder:

```powershell
docker compose -f docker-compose.appointment.yml up -d --build
```

Check containers:

```powershell
docker compose -f docker-compose.appointment.yml ps
```

View logs:

```powershell
docker compose -f docker-compose.appointment.yml logs -f appointment-service
docker compose -f docker-compose.appointment.yml logs -f postgres-appointment
docker compose -f docker-compose.appointment.yml logs -f rabbitmq
```

Stop everything:

```powershell
docker compose -f docker-compose.appointment.yml down
```

Stop and remove DB volume (full reset):

```powershell
docker compose -f docker-compose.appointment.yml down -v
```

## 2) Local Spring Boot + Docker infra mode

Start only infra:

```powershell
docker compose -f docker-compose.appointment.yml up -d postgres-appointment rabbitmq
```

(Optional) Stop containerized appointment-service to avoid confusion:

```powershell
docker compose -f docker-compose.appointment.yml stop appointment-service
```

Verify Postgres port is reachable before running local Spring Boot:

```powershell
Test-NetConnection localhost -Port 5434
```

Then run local app (IDE run button or):

```powershell
mvn spring-boot:run
```

## 3) Health and quick checks

Swagger UI:

```text
http://localhost:8088/swagger-ui.html
```

RabbitMQ UI:

```text
http://localhost:15672
```

Credentials:

```text
username: admin
password: password
```

## 4) Docker Desktop daemon recovery (if docker pipe errors appear)

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
docker info
```

If needed:

```powershell
wsl --shutdown
```

Then restart Docker Desktop and run `docker info` again.
