# SE3020 – Curex Healthcare Platform: Full Team Guide

### AI-Enabled Smart Healthcare Appointment & Telemedicine Platform

**BSc (Hons) IT – Software Engineering | Year 3 Semester 1 | Group Project**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack – Choices & Justification](#2-tech-stack--choices--justification)
3. [Architecture Overview](#3-architecture-overview)
4. [Repository Architecture](#4-repository-architecture)

- [Makefile Guide (Beginner Friendly)](#makefile-guide-beginner-friendly)

5. [Message / Event Broker – Choosing & Why](#5-message--event-broker--choosing--why)
6. [Member Responsibilities](#6-member-responsibilities)
7. [Individual Member Guides](#7-individual-member-guides)
   - [M1 – Auth, Admin & Notification](#m1--auth-admin--notification-service)
   - [M2 – Patient, Doctor, AI & Prescription](#m2--patient-doctor-ai--prescription-service)
   - [M3 – File Upload & Payment](#m3--file-upload--payment-service)
   - [M4 – Appointment & Telemedicine](#m4--appointment--telemedicine-service)
8. [JWT Authentication Flow](#8-jwt-authentication-flow)
9. [Inter-Service Communication](#9-inter-service-communication)
10. [Docker Setup](#10-docker-setup)
11. [Kubernetes Setup](#11-kubernetes-setup)
12. [Sprint Plan (2–3 Weeks)](#12-sprint-plan-23-weeks)
13. [Assignment Deliverables Checklist](#13-assignment-deliverables-checklist)

---

## 1. Project Overview

A cloud-native telemedicine platform built with a **microservices architecture** similar to real-world systems like Channeling.lk and oDoc. Patients can book doctor appointments, attend video consultations, upload medical reports, and receive AI-based health suggestions.

**Three user roles:**

- **Patient** – Register, book appointments, upload reports, attend video consultations, view prescriptions
- **Doctor** – Manage profile/availability, accept appointments, conduct telemedicine sessions, issue prescriptions
- **Admin** – Manage users, verify doctor registrations, oversee platform operations

**Total services: 10**

| Service              | Owner  | Port |
| -------------------- | ------ | ---- |
| API Gateway          | Shared | 8080 |
| Auth Service         | M1     | 8081 |
| Notification Service | M1     | 8082 |
| Patient Service      | M2     | 8083 |
| Doctor Service       | M2     | 8084 |
| AI Symptom Service   | M2     | 8085 |
| Report Service       | M3     | 8086 |
| Payment Service      | M3     | 8087 |
| Appointment Service  | M4     | 8088 |
| Telemedicine Service | M4     | 8089 |

---

## 2. Tech Stack – Choices & Justification

### Frontend – React.js (Vite)

**Why React:**

- Component-based architecture maps perfectly to our multi-role UI (Patient dashboard, Doctor dashboard, Admin panel)
- Async-first by default – directly satisfies the assignment requirement for an "asynchronous web client using a JavaScript framework"
- React Context + Axios handles JWT token storage and injection into every API call
- Vite gives instant HMR (Hot Module Replacement) for fast development
- Widely documented, all team members familiar

**Key libraries:**

- `axios` – HTTP client with interceptors for automatic JWT header injection
- `react-router-dom` – Client-side routing with role-based route guards
- `react-query` – Server state management, caching API responses
- `tailwindcss` – Utility-first CSS, fast to build consistent UI

---

### Backend – Java Spring Boot 3.x

**Why Spring Boot:**

- Industry-standard framework for building microservices in Java
- Built-in Spring Security handles JWT authentication and Role-Based Access Control (RBAC) with minimal configuration
- Spring Data JPA eliminates raw SQL – entities map to database tables automatically (your Prisma equivalent for Java)
- Spring Cloud Gateway provides a production-grade API gateway with routing, JWT validation, and load balancing out of the box
- Spring Cloud OpenFeign simplifies HTTP calls between microservices down to a single annotated interface
- Each service compiles to an independent JAR – perfect for Docker containerisation

**Key Spring Boot starters per service:**

| Starter                          | Purpose                                 |
| -------------------------------- | --------------------------------------- |
| `spring-boot-starter-web`        | REST controllers                        |
| `spring-boot-starter-data-jpa`   | ORM / database access (replaces Prisma) |
| `spring-boot-starter-security`   | JWT + RBAC (M1 only)                    |
| `spring-boot-starter-mail`       | Email notifications (M1 only)           |
| `spring-cloud-starter-gateway`   | API Gateway routing                     |
| `spring-cloud-starter-openfeign` | Inter-service HTTP calls                |

---

### Database – PostgreSQL

**Why PostgreSQL over alternatives:**

| Option            | Verdict                | Reason                                                                                                                             |
| ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL** ✅ | Best choice            | Relational, ACID-compliant, open-source, Docker-friendly, perfect for structured healthcare data                                   |
| MySQL             | Acceptable alternative | Similar to Postgres, slightly fewer features                                                                                       |
| MongoDB           | Not suitable           | NoSQL is unstructured; healthcare records (patients → appointments → prescriptions → payments) require strong relational integrity |
| H2 In-Memory      | Dev/testing only       | Data disappears on restart                                                                                                         |

**Database per Service pattern:** Each microservice has its own isolated PostgreSQL database. This is a core microservices principle – services cannot directly query each other's databases. All cross-service data access goes through REST APIs only.

| Service              | Database Name    |
| -------------------- | ---------------- |
| Auth Service         | `auth_db`        |
| Patient Service      | `patient_db`     |
| Doctor Service       | `doctor_db`      |
| Report Service       | `report_db`      |
| Payment Service      | `payment_db`     |
| Appointment Service  | `appointment_db` |
| Telemedicine Service | `telemed_db`     |

---

### ORM – Spring Data JPA + Hibernate (Java's Prisma equivalent)

You write Java entity classes with annotations. JPA generates all SQL automatically. No raw SQL needed for standard CRUD operations.

```java
@Entity
@Table(name = "patients")
public class Patient {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;
    private String bloodType;
    private LocalDate dateOfBirth;

    // JPA auto-generates INSERT / SELECT / UPDATE / DELETE
}
```

The `JpaRepository` interface gives you `save()`, `findById()`, `findAll()`, `delete()` for free – exactly like Prisma's generated client methods.

---

### Authentication – JWT (JSON Web Tokens)

**Why JWT over sessions:**

- Stateless – no session storage needed across 10 services
- Each service can validate the token independently without calling the auth service on every request
- The token carries the user's ID and role – downstream services can use these directly
- Scales horizontally – works with multiple instances of each service

---

### Containerisation – Docker

Each microservice compiles to a JAR, which gets wrapped in a Docker image. Every service runs in its own isolated container with its own environment variables and database connection. Docker Compose ties everything together for local development with a single command.

**Why Docker:**

- Eliminates "works on my machine" problems across the team
- Matches production deployment to Kubernetes exactly
- Required by the assignment

---

### Orchestration – Kubernetes (K8s)

Kubernetes manages container deployment, scaling, and self-healing in production. Required explicitly by the assignment.

**Why Kubernetes:**

- Auto-restarts crashed containers
- Easy horizontal scaling (increase `replicas` in YAML)
- Service discovery – services find each other by name, not IP
- Industry standard for microservices orchestration

**Local setup:** Use **Minikube** (free, runs on laptop) for development and demo.

---

### Video Consultations – Jitsi Meet (free)

**Why Jitsi over Twilio/Agora:**

- Completely free, no API key required for basic usage
- No backend SDK needed – generate a unique room URL and send it to both patient and doctor
- Both parties click the same link – video starts immediately
- For production-grade security, Jitsi supports JWT room locking

---

### Payment – PayHere (Sri Lanka)

- Local Sri Lankan payment gateway with sandbox environment available
- Supports credit/debit cards and local payment methods
- Webhook-based payment confirmation (PayHere calls your backend on success/failure)
- Satisfies the assignment requirement for Sri Lankan payment gateways

---

### Notifications – JavaMailSender + Twilio SMS

- **JavaMailSender** (built into Spring Boot) handles email via Gmail SMTP – free
- **Twilio** provides SMS API with a free trial tier
- Both are triggered by events: appointment booked, payment confirmed, consultation completed

---

### AI Symptom Checker – OpenAI API (or Google Gemini API)

- Patient inputs symptoms as text
- Backend sends a structured prompt to OpenAI/Gemini
- Returns possible conditions and recommended doctor specialty as JSON
- **Google Gemini API** has a free tier if cost is a concern

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend                      │
│         (SPA · Axios · JWT in localStorage)          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│                   API Gateway                        │
│     (Spring Cloud Gateway · JWT validation)          │
│              Routes all traffic                      │
└───┬──────────┬──────────┬──────────┬────────────────┘
    │          │          │          │
┌───▼──┐  ┌───▼──┐  ┌────▼─┐  ┌────▼──┐
│  M1  │  │  M2  │  │  M3  │  │  M4   │
│Auth  │  │Patient│  │Report│  │Appt   │
│Admin │  │Doctor │  │Payment│ │Telemed│
│Notif │  │AI/Rx  │  │      │  │       │
└──┬───┘  └──┬───┘  └──┬───┘  └───┬───┘
   │         │          │          │
┌──▼──┐ ┌───▼──┐ ┌─────▼──┐ ┌────▼───┐
│auth │ │patnt │ │report  │ │appt    │
│_db  │ │_db   │ │_db     │ │_db     │
└─────┘ └──────┘ └────────┘ └────────┘
```

**Data flows:**

- All client requests hit the API Gateway first
- Gateway validates JWT token and forwards `userId` + `role` as headers
- Each service trusts those forwarded headers
- Services call each other via Feign Client (HTTP) or via RabbitMQ events
- No service touches another service's database

---

## 4. Repository Architecture

### Decision: Monorepo (one GitHub repository)

**Why not polyrepo (separate repo per service):**

- Assignment requires one GitHub link in `submission.txt`
- 4-person team, 5-week timeline – managing 10+ repos adds overhead with zero benefit
- Harder to run docker-compose across separate repos

**Why not Git Submodules:**

- Submodules store pointers to commits, not actual code – teammates must use `git clone --recurse-submodules` or folders appear empty
- Changes to a sub-repo require two separate pushes (the sub-repo + updating the pointer in the main repo)
- Entering a submodule folder puts git in detached HEAD state – commits made here can be orphaned and lost
- Docker Compose fails with cryptic errors when submodule folders are empty
- Designed for consuming external libraries, not for teams actively developing together

**The monorepo is still proper microservices architecture.** Each service has its own `pom.xml`, runs on its own port, has its own Docker container, and connects to its own database. The repo structure is just a developer convenience – it does not affect the runtime architecture.

---

### Folder Structure

```
Curex/                               ← single GitHub repository
│
├── .gitignore                        ← covers Java + React + Docker
├── README.md
├── Makefile                          ← shortcuts (make fe-install, make fe-dev)
├── docker-compose.yml                ← run everything locally: docker-compose up
│
├── curex-be/
│   ├── api-gateway/                  ← Spring Cloud Gateway
│   │   ├── src/main/java/...
│   │   ├── src/main/resources/
│   │   │   └── application.yml       ← all routing rules here
│   │   ├── Dockerfile
│   │   └── pom.xml
│   │
│   └── services/
│       ├── auth-service/             ← M1 (port 8081)
│       │   ├── src/main/java/
│       │   │   └── com/healthcare/auth/
│       │   │       ├── controller/
│       │   │       ├── service/
│       │   │       ├── repository/
│       │   │       ├── entity/
│       │   │       ├── dto/
│       │   │       ├── security/     ← JWT filter, SecurityConfig
│       │   │       └── AuthServiceApplication.java
│       │   ├── src/main/resources/
│       │   │   └── application.properties
│       │   ├── Dockerfile
│       │   └── pom.xml
│       │
│       ├── notification-service/     ← M1 (port 8082)
│       ├── patient-service/          ← M2 (port 8083)
│       ├── doctor-service/           ← M2 (port 8084)
│       ├── ai-symptom-service/       ← M2 (port 8085)
│       ├── report-service/           ← M3 (port 8086)
│       ├── payment-service/          ← M3 (port 8087)
│       ├── appointment-service/      ← M4 (port 8088)
│       └── telemedicine-service/     ← M4 (port 8089)
│
├── curex-fe/                         ← React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── patient/
│   │   │   ├── doctor/
│   │   │   └── admin/
│   │   ├── components/
│   │   ├── services/                 ← Axios API call functions
│   │   ├── context/                  ← AuthContext (JWT storage)
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
│
├── k8s/
│   ├── deployments/
│   │   ├── auth-deployment.yaml
│   │   ├── patient-deployment.yaml
│   │   └── ...                       ← one file per service
│   └── services/
│       ├── auth-service.yaml
│       └── ...
│
└── docs/
    └── architecture-diagram.png      ← for the report PDF
```

---

### Makefile Guide (Beginner Friendly)

Many team members are new to Makefiles, so this section explains exactly how to use ours.

What is a Makefile:

- A Makefile is a list of shortcut commands called targets
- You run them with `make <target>`
- It helps the whole team use the same commands from the repo root

Why we use it in this project:

- Avoids long, repeated terminal commands
- Reduces setup mistakes (wrong folder, wrong command)
- Makes onboarding easier for new teammates

Current Curex Make targets:

- `make` -> shows help and available targets
- `make fe-install` -> installs frontend dependencies
- `make fe` -> starts frontend dev server (same as `make fe-dev`)
- `make fe-dev` -> starts frontend dev server
- `make fe-build` -> builds frontend for production
- `make fe-preview` -> previews production build locally

When to use each target:

1. First time setup:

```bash
make fe-install
```

2. Daily development:

```bash
make fe
```

3. Before submitting frontend changes:

```bash
make fe-build
make fe-preview
```

If `make` command is missing:

- macOS: run `xcode-select --install`
- Linux: install `make` using your package manager
- Windows: use WSL or Git Bash with `make` installed

Team rule:

- Run all Make commands from the repository root (`Curex/`)
- Do not run Make commands from inside `curex-fe/` or `curex-be/`

---

### Adding Backend Service Commands to Makefile

As each team member builds their backend services, they should add Make targets so the whole team can run them easily.

**What is a Make target:**

- A target is a command name that executes a recipe (one or more shell commands)
- Format: `target-name:` followed by indented commands
- Variables like `$(BE_DIR)` store values (e.g., `curex-be`)

**How to add a backend service target:**

1. Open the root `Makefile`
2. Find the section `# ─── Backend Service Targets (Examples) ───`
3. Uncomment or copy one of the example patterns
4. Replace `auth` with your service name
5. Save and test

**Example for auth-service (already in Makefile):**

```makefile
be-build-auth:
	cd $(BE_DIR)/services/auth-service && mvn clean package -DskipTests

be-run-auth:
	cd $(BE_DIR)/services/auth-service && mvn spring-boot:run
```

**How to use it:**

```bash
make be-build-auth    # compiles auth-service into a JAR
make be-run-auth      # runs auth-service locally on port 8081
```

**To add a new service (e.g., patient-service):**

1. Copy this pattern into the Makefile:

```makefile
be-build-patient:
	cd $(BE_DIR)/services/patient-service && mvn clean package -DskipTests

be-run-patient:
	cd $(BE_DIR)/services/patient-service && mvn spring-boot:run
```

2. Add the target names to the `.PHONY` line at the top:

```makefile
.PHONY: help fe fe-install fe-dev fe-build fe-preview \
        be-build-auth be-run-auth \
        be-build-patient be-run-patient
```

3. Test:

```bash
make be-build-patient
make be-run-patient
```

**Template for all 8 backend services (M1–M4):**

M1 owns auth-service and notification-service:

```makefile
be-build-auth:
	cd $(BE_DIR)/services/auth-service && mvn clean package -DskipTests

be-run-auth:
	cd $(BE_DIR)/services/auth-service && mvn spring-boot:run

be-build-notification:
	cd $(BE_DIR)/services/notification-service && mvn clean package -DskipTests

be-run-notification:
	cd $(BE_DIR)/services/notification-service && mvn spring-boot:run
```

M2 owns patient-service, doctor-service, and ai-symptom-service:

```makefile
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
```

M3 owns report-service and payment-service:

```makefile
be-build-report:
	cd $(BE_DIR)/services/report-service && mvn clean package -DskipTests

be-run-report:
	cd $(BE_DIR)/services/report-service && mvn spring-boot:run

be-build-payment:
	cd $(BE_DIR)/services/payment-service && mvn clean package -DskipTests

be-run-payment:
	cd $(BE_DIR)/services/payment-service && mvn spring-boot:run
```

M4 owns appointment-service and telemedicine-service:

```makefile
be-build-appointment:
	cd $(BE_DIR)/services/appointment-service && mvn clean package -DskipTests

be-run-appointment:
	cd $(BE_DIR)/services/appointment-service && mvn spring-boot:run

be-build-telemedicine:
	cd $(BE_DIR)/services/telemedicine-service && mvn clean package -DskipTests

be-run-telemedicine:
	cd $(BE_DIR)/services/telemedicine-service && mvn spring-boot:run
```

**Advanced: Add Docker targets for building service images:**

```makefile
be-docker-auth:
	cd $(BE_DIR)/services/auth-service && mvn clean package -DskipTests && docker build -t auth-service .

be-docker-patient:
	cd $(BE_DIR)/services/patient-service && mvn clean package -DskipTests && docker build -t patient-service .
```

**Common workflow with Make targets:**

```bash
# Install dependencies and build
make fe-install                    # frontend
make be-build-auth                 # backend auth-service

# Run locally
make fe                            # frontend dev server (http://localhost:3000)
make be-run-auth                   # auth-service (http://localhost:8081)

# Or use Docker Compose
make docker-up                     # start all services
make docker-logs                   # watch logs
make docker-down                   # stop all services
```

**Pro tip: Combine targets in one command:**

```bash
make be-build-auth && make be-run-auth    # build then run auth-service
```

---

### Git Branch Strategy

Each member works on their own branch to avoid conflicts:

```bash
git checkout -b feature/m1-auth-service        # M1
git checkout -b feature/m2-patient-doctor      # M2
git checkout -b feature/m3-files-payments      # M3
git checkout -b feature/m4-appointments        # M4
```

Commit naming convention:

```
feat(auth): add JWT login endpoint
feat(patient): add profile CRUD
fix(payment): correct PayHere hash generation
chore: update docker-compose ports
```

When a feature is complete, raise a **Pull Request** into `main`. One other member reviews and merges.

---

### Root .gitignore

```gitignore
# Java / Maven
target/
*.class
*.jar
*.war
.mvn/
mvnw
mvnw.cmd

# React
node_modules/
dist/
.env
.env.local
.env.production

# IDE
.idea/
.vscode/
*.iml
*.iws

# OS
.DS_Store
Thumbs.db

# Docker
*.log
```

---

## 5. Message / Event Broker – Choosing & Why

### What is a Message Broker and Why Do We Need One?

In a microservices system, services need to communicate with each other. There are two ways:

**Synchronous (HTTP / Feign Client):**

- Service A calls Service B and waits for a response
- Simple and easy to implement
- Problem: if Service B is down, Service A fails too

**Asynchronous (Message Broker):**

- Service A publishes an event to a queue and continues immediately
- Service B picks up the event whenever it's ready
- Services are fully decoupled – one being down does not crash the other

---

### Options Compared

| Broker            | Best for                                                 | Complexity | Good fit?                    |
| ----------------- | -------------------------------------------------------- | ---------- | ---------------------------- |
| **RabbitMQ** ✅   | Simple event-driven messaging, task queues               | Low–Medium | Yes – ideal for your project |
| **Apache Kafka**  | High-throughput event streaming, millions of events/sec  | High       | Overkill for this project    |
| **Spring Events** | In-process events within one JVM                         | None       | Only within same service     |
| **REST (Feign)**  | Synchronous calls where a response is needed immediately | Low        | Use for queries, not events  |

---

### Decision: RabbitMQ

**Why RabbitMQ over Kafka for your project:**

- Kafka is designed for massive data pipelines (logs, analytics, millions of events per second). Your platform handles hundreds of appointments, not millions of events.
- RabbitMQ has a much gentler learning curve and simpler setup in Docker
- Spring Boot has first-class RabbitMQ support via `spring-boot-starter-amqp`
- RabbitMQ management UI is available at `http://localhost:15672` – easy to debug during development
- Kafka requires ZooKeeper (or KRaft) – more infrastructure for no benefit at your scale

---

### Where to Use RabbitMQ vs Feign Client

| Scenario                                           | Use              | Reason                                                        |
| -------------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| M4 books an appointment → trigger email/SMS        | **RabbitMQ**     | Notification service doesn't need to respond; fire and forget |
| M3 payment confirmed → update appointment status   | **RabbitMQ**     | Decoupled; payment service doesn't need to wait               |
| M4 checks doctor availability before booking       | **Feign Client** | Needs an immediate response to proceed                        |
| M2 returns patient profile data                    | **Feign Client** | Synchronous query with response required                      |
| Appointment completed → send prescription reminder | **RabbitMQ**     | Async notification, no response needed                        |

---

### RabbitMQ Setup

Add to `docker-compose.yml`:

```yaml
rabbitmq:
  image: rabbitmq:3-management
  ports:
    - "5672:5672" # AMQP protocol
    - "15672:15672" # Management UI (login: guest / guest)
  environment:
    RABBITMQ_DEFAULT_USER: admin
    RABBITMQ_DEFAULT_PASS: password
```

Add to each service that uses messaging (`pom.xml`):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

**Publishing an event (M4 Appointment Service):**

```java
@Service
public class AppointmentService {
    @Autowired
    private RabbitTemplate rabbitTemplate;

    public Appointment bookAppointment(BookingRequest req) {
        Appointment appt = appointmentRepo.save(new Appointment(req));

        // Fire event to notification service – no waiting
        AppointmentBookedEvent event = new AppointmentBookedEvent(
            appt.getId(), appt.getPatientEmail(),
            appt.getDoctorName(), appt.getAppointmentTime()
        );
        rabbitTemplate.convertAndSend("healthcare.exchange", "appointment.booked", event);

        return appt;
    }
}
```

**Consuming an event (M1 Notification Service):**

```java
@Service
public class NotificationConsumer {
    @Autowired
    private EmailService emailService;

    @RabbitListener(queues = "appointment.booked.queue")
    public void handleAppointmentBooked(AppointmentBookedEvent event) {
        emailService.send(
            event.getPatientEmail(),
            "Appointment Confirmed",
            "Your appointment with Dr. " + event.getDoctorName() +
            " is confirmed for " + event.getAppointmentTime()
        );
    }
}
```

---

## 6. Member Responsibilities

### M1 – Auth, Admin & Notification

| Service              | Key Responsibilities                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Auth Service         | User registration (Patient/Doctor/Admin), JWT login, token validation, BCrypt password hashing, RBAC |
| Admin Service        | Approve/reject doctor accounts, manage all users, view platform stats                                |
| Notification Service | Email via JavaMailSender, SMS via Twilio, consume RabbitMQ events from other services                |

**Frontend pages:** Login, Registration, Admin dashboard (user management, doctor approval), notification toasts

---

### M2 – Patient, Doctor, AI & Prescription

| Service            | Key Responsibilities                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Patient Service    | Patient profile CRUD, medical history, view prescriptions                                       |
| Doctor Service     | Doctor profile CRUD, set availability schedules, issue digital prescriptions                    |
| AI Symptom Service | Accept symptom text, call OpenAI/Gemini API, return possible conditions + recommended specialty |

**Frontend pages:** Patient dashboard (profile, history, prescriptions), Doctor dashboard (availability, prescriptions), AI symptom checker interface

---

### M3 – File Upload & Payment

| Service         | Key Responsibilities                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Report Service  | Upload medical reports (PDF/images), store metadata in DB, secure file access by patient ID                   |
| Payment Service | Create PayHere checkout session, verify webhook, link payment to appointment, publish payment confirmed event |

**Frontend pages:** Upload and view medical reports, payment checkout page, payment success/failure UI

---

### M4 – Appointment & Telemedicine

| Service              | Key Responsibilities                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Appointment Service  | Search doctors by specialty, book/modify/cancel appointments, track status, call doctor-service for availability |
| Telemedicine Service | Generate Jitsi Meet session URL, store session per appointment, manage session lifecycle                         |

**Frontend pages:** Doctor search, appointment booking UI, appointment tracking dashboard, video consultation interface

---

## 7. Individual Member Guides

---

### M1 – Auth, Admin & Notification Service

**Spring Boot dependencies (`pom.xml`):**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.11.5</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.11.5</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

**User entity:**

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String passwordHash;  // BCrypt – never store plain text

    @Enumerated(EnumType.STRING)
    private Role role;  // PATIENT, DOCTOR, ADMIN

    private boolean isVerified;  // Doctor verification by admin
    private LocalDateTime createdAt;
}
```

**JWT filter (intercepts every request):**

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(jwtSecret.getBytes()))
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

                UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(
                        claims.getSubject(), null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + claims.get("role")))
                    );
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (JwtException e) {
                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }
        chain.doFilter(req, res);
    }
}
```

**Login endpoint:**

```java
@PostMapping("/auth/login")
public ResponseEntity<?> login(@RequestBody LoginRequest req) {
    User user = userRepo.findByEmail(req.getEmail())
        .orElseThrow(() -> new RuntimeException("User not found"));

    if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
        return ResponseEntity.status(401).body("Invalid credentials");
    }

    String token = Jwts.builder()
        .setSubject(user.getId())
        .claim("role", user.getRole().name())
        .claim("email", user.getEmail())
        .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 24h
        .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes()))
        .compact();

    return ResponseEntity.ok(Map.of("token", token, "role", user.getRole()));
}
```

**Email notification (application.properties):**

```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=yourapp@gmail.com
spring.mail.password=your-16-char-app-password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

> Note: Use a Gmail App Password (not your account password). Generate one at Google Account → Security → 2-Step Verification → App Passwords.

**Notification consumer (RabbitMQ):**

```java
@RabbitListener(queues = "appointment.booked.queue")
public void onAppointmentBooked(AppointmentBookedEvent event) {
    SimpleMailMessage msg = new SimpleMailMessage();
    msg.setTo(event.getPatientEmail());
    msg.setSubject("Appointment Confirmed – " + event.getDoctorName());
    msg.setText("Your appointment is confirmed for " + event.getAppointmentTime());
    mailSender.send(msg);
}
```

**REST Endpoints (M1):**

| Method | Endpoint                     | Role     | Description                   |
| ------ | ---------------------------- | -------- | ----------------------------- |
| POST   | `/auth/register/patient`     | Public   | Register as patient           |
| POST   | `/auth/register/doctor`      | Public   | Register as doctor            |
| POST   | `/auth/login`                | Public   | Login, returns JWT            |
| GET    | `/auth/me`                   | Any auth | Get current user              |
| GET    | `/admin/users`               | ADMIN    | List all users                |
| GET    | `/admin/doctors/pending`     | ADMIN    | Doctors awaiting verification |
| PATCH  | `/admin/doctors/{id}/verify` | ADMIN    | Approve/reject doctor         |
| POST   | `/notifications/email`       | Internal | Send email                    |
| POST   | `/notifications/sms`         | Internal | Send SMS                      |

**Build priority for M1:** JWT auth must work before any other member can test their secured endpoints. Complete auth-service first, then notification-service.

---

### M2 – Patient, Doctor, AI & Prescription Service

**Spring Boot dependencies:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
```

**Doctor availability entity:**

```java
@Entity
public class DoctorAvailability {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String doctorId;

    @Enumerated(EnumType.STRING)
    private DayOfWeek day;  // MONDAY, TUESDAY, etc.

    private LocalTime startTime;
    private LocalTime endTime;
    private boolean isBooked;
}
```

**Prescription entity:**

```java
@Entity
public class Prescription {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String doctorId;
    private String patientId;
    private String appointmentId;

    @Column(columnDefinition = "TEXT")
    private String medicines;    // JSON string or comma-separated

    @Column(columnDefinition = "TEXT")
    private String instructions;

    private LocalDateTime issuedAt;
}
```

**AI Symptom Checker (OpenAI):**

```java
@PostMapping("/ai/symptoms/check")
public ResponseEntity<?> checkSymptoms(@RequestBody SymptomRequest req) {
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(openaiApiKey);
    headers.setContentType(MediaType.APPLICATION_JSON);

    String prompt = "Patient symptoms: " + req.getSymptoms() +
        ". Suggest 3 possible medical conditions and the recommended doctor specialty. " +
        "Respond ONLY in JSON format: " +
        "{\"conditions\": [\"...\", \"...\", \"...\"], \"specialty\": \"...\", \"urgency\": \"low|medium|high\"}";

    Map<String, Object> body = Map.of(
        "model", "gpt-4o-mini",
        "messages", List.of(Map.of("role", "user", "content", prompt)),
        "max_tokens", 300
    );

    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
    ResponseEntity<Map> response = restTemplate.postForEntity(
        "https://api.openai.com/v1/chat/completions", entity, Map.class);

    // Parse and return the content field
    return ResponseEntity.ok(response.getBody());
}
```

**REST Endpoints (M2):**

| Method | Endpoint                       | Description            |
| ------ | ------------------------------ | ---------------------- |
| POST   | `/patients`                    | Create patient profile |
| GET    | `/patients/{id}`               | Get patient profile    |
| PUT    | `/patients/{id}`               | Update patient profile |
| GET    | `/patients/{id}/history`       | Medical history        |
| GET    | `/patients/{id}/prescriptions` | All prescriptions      |
| POST   | `/doctors`                     | Create doctor profile  |
| GET    | `/doctors/{id}`                | Get doctor profile     |
| PUT    | `/doctors/{id}`                | Update doctor profile  |
| POST   | `/doctors/{id}/availability`   | Set availability slots |
| GET    | `/doctors/{id}/availability`   | Get availability       |
| POST   | `/prescriptions`               | Issue prescription     |
| POST   | `/ai/symptoms/check`           | AI symptom analysis    |

---

### M3 – File Upload & Payment Service

**Spring Boot dependencies:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

**File upload (stores on filesystem volume):**

```java
@PostMapping("/reports/upload")
public ResponseEntity<?> uploadReport(
        @RequestParam("file") MultipartFile file,
        @RequestParam("patientId") String patientId) throws IOException {

    // Validate file type
    String contentType = file.getContentType();
    if (!List.of("application/pdf", "image/jpeg", "image/png").contains(contentType)) {
        return ResponseEntity.badRequest().body("Only PDF and images allowed");
    }

    // Save file to mounted Docker volume
    String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
    Path uploadPath = Paths.get(uploadDir).resolve(filename);
    Files.createDirectories(uploadPath.getParent());
    Files.copy(file.getInputStream(), uploadPath);

    // Save metadata to DB
    Report report = new Report();
    report.setPatientId(patientId);
    report.setOriginalFilename(file.getOriginalFilename());
    report.setStoredFilename(filename);
    report.setFileSize(file.getSize());
    report.setUploadedAt(LocalDateTime.now());
    reportRepo.save(report);

    return ResponseEntity.ok(report);
}
```

**PayHere payment initiation:**

```java
@PostMapping("/payments/appointments/{appointmentId}")
public ResponseEntity<?> initiatePayment(
        @PathVariable String appointmentId,
        @RequestBody PaymentRequest req) {

    String orderId = "APPT-" + appointmentId;
    String amount = String.format("%.2f", req.getAmount());
    String currency = "LKR";

    // Generate MD5 hash required by PayHere
    String hashInput = merchantId + orderId + amount + currency +
        DigestUtils.md5Hex(merchantSecret).toUpperCase();
    String hash = DigestUtils.md5Hex(hashInput).toUpperCase();

    Map<String, String> checkoutData = new LinkedHashMap<>();
    checkoutData.put("merchant_id", merchantId);
    checkoutData.put("return_url", "https://yourapp.com/payment/success");
    checkoutData.put("cancel_url", "https://yourapp.com/payment/cancel");
    checkoutData.put("notify_url", "https://yourapp.com/payments/webhook");
    checkoutData.put("order_id", orderId);
    checkoutData.put("items", "Doctor Consultation");
    checkoutData.put("amount", amount);
    checkoutData.put("currency", currency);
    checkoutData.put("hash", hash);

    return ResponseEntity.ok(checkoutData);
}

@PostMapping("/payments/webhook")
public ResponseEntity<?> webhook(@RequestBody Map<String, String> notification) {
    // Verify PayHere signature
    // Update payment status in DB
    // Publish event to RabbitMQ → appointment service marks as CONFIRMED
    String appointmentId = notification.get("order_id").replace("APPT-", "");
    rabbitTemplate.convertAndSend("healthcare.exchange",
        "payment.confirmed", new PaymentConfirmedEvent(appointmentId));
    return ResponseEntity.ok("OK");
}
```

**REST Endpoints (M3):**

| Method | Endpoint                      | Description             |
| ------ | ----------------------------- | ----------------------- |
| POST   | `/reports/upload`             | Upload medical report   |
| GET    | `/reports/{id}`               | Get report metadata     |
| GET    | `/patients/{id}/reports`      | All reports for patient |
| DELETE | `/reports/{id}`               | Delete report           |
| POST   | `/payments/appointments/{id}` | Initiate payment        |
| GET    | `/payments/{id}`              | Get payment status      |
| POST   | `/payments/webhook`           | PayHere callback        |
| GET    | `/patients/{id}/payments`     | Payment history         |

---

### M4 – Appointment & Telemedicine Service

**Spring Boot dependencies:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

**Appointment entity:**

```java
@Entity
@Table(name = "appointments")
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String patientId;
    private String doctorId;
    private LocalDateTime appointmentTime;

    @Enumerated(EnumType.STRING)
    private AppointmentStatus status;
    // PENDING → CONFIRMED → IN_SESSION → COMPLETED | CANCELLED

    @Enumerated(EnumType.STRING)
    private AppointmentType type;  // IN_PERSON, TELEMEDICINE

    private String paymentId;
    private String sessionUrl;    // Jitsi URL for telemedicine
    private String notes;
}
```

**Feign client to call doctor-service (M2):**

```java
@FeignClient(name = "doctor-service", url = "${services.doctor.url}")
public interface DoctorClient {

    @GetMapping("/doctors/{id}/availability")
    List<AvailabilitySlot> getAvailability(@PathVariable String id);

    @PatchMapping("/doctors/{id}/availability/{slotId}/book")
    void markSlotBooked(@PathVariable String id, @PathVariable String slotId);
}
```

**Booking logic with RabbitMQ event:**

```java
@PostMapping("/appointments")
public ResponseEntity<?> bookAppointment(@RequestBody BookingRequest req) {
    // Check availability via Feign → Doctor Service
    List<AvailabilitySlot> slots = doctorClient.getAvailability(req.getDoctorId());
    boolean slotAvailable = slots.stream()
        .anyMatch(s -> s.getId().equals(req.getSlotId()) && !s.isBooked());

    if (!slotAvailable) {
        return ResponseEntity.badRequest().body("Slot not available");
    }

    // Create appointment
    Appointment appt = new Appointment();
    appt.setPatientId(req.getPatientId());
    appt.setDoctorId(req.getDoctorId());
    appt.setAppointmentTime(req.getAppointmentTime());
    appt.setStatus(AppointmentStatus.PENDING);
    appt.setType(req.getType());
    appointmentRepo.save(appt);

    // Mark slot as booked
    doctorClient.markSlotBooked(req.getDoctorId(), req.getSlotId());

    // Publish event → Notification Service sends email
    rabbitTemplate.convertAndSend("healthcare.exchange", "appointment.booked",
        new AppointmentBookedEvent(appt.getId(), req.getPatientEmail(),
            req.getDoctorName(), req.getAppointmentTime()));

    return ResponseEntity.ok(appt);
}
```

**Telemedicine session (Jitsi – no backend SDK needed):**

```java
@PostMapping("/telemed/appointments/{id}/session")
public ResponseEntity<?> createSession(@PathVariable String id) {
    Appointment appt = appointmentRepo.findById(id)
        .orElseThrow(() -> new RuntimeException("Appointment not found"));

    if (appt.getType() != AppointmentType.TELEMEDICINE) {
        return ResponseEntity.badRequest().body("Not a telemedicine appointment");
    }

    // Generate unique, unguessable room name
    String roomName = "consult-" + id + "-" + Long.toHexString(System.currentTimeMillis());
    String sessionUrl = "https://meet.jit.si/" + roomName;

    appt.setSessionUrl(sessionUrl);
    appt.setStatus(AppointmentStatus.IN_SESSION);
    appointmentRepo.save(appt);

    // Notify both patient and doctor via RabbitMQ
    rabbitTemplate.convertAndSend("healthcare.exchange", "session.created",
        new SessionCreatedEvent(appt.getId(), sessionUrl,
            appt.getPatientId(), appt.getDoctorId()));

    return ResponseEntity.ok(Map.of("sessionUrl", sessionUrl));
}
```

**REST Endpoints (M4):**

| Method | Endpoint                             | Description                      |
| ------ | ------------------------------------ | -------------------------------- |
| GET    | `/appointments/search`               | Search doctors by specialty/date |
| POST   | `/appointments`                      | Book appointment                 |
| GET    | `/appointments/{id}`                 | Get appointment details          |
| PATCH  | `/appointments/{id}`                 | Modify appointment               |
| DELETE | `/appointments/{id}`                 | Cancel appointment               |
| POST   | `/telemed/appointments/{id}/session` | Create video session             |
| GET    | `/telemed/appointments/{id}/session` | Get session URL                  |
| POST   | `/telemed/appointments/{id}/end`     | End session                      |

---

## 8. JWT Authentication Flow

```
1. User submits email + password to POST /auth/login
2. Auth Service validates credentials against DB
3. If valid: sign JWT token containing { userId, email, role, expiry }
4. Return token to React frontend
5. React stores token in localStorage
6. Every subsequent API call adds header: Authorization: Bearer <token>
7. API Gateway intercepts request, validates JWT signature
8. Gateway forwards userId and role as request headers to downstream service
9. Downstream service reads headers – no need to re-validate token
10. @PreAuthorize("hasRole('DOCTOR')") annotations protect endpoints by role
```

**Role-based endpoint protection:**

```java
@GetMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<?> getAllUsers() { ... }

@PostMapping("/prescriptions")
@PreAuthorize("hasRole('DOCTOR')")
public ResponseEntity<?> issuePrescription(...) { ... }

@GetMapping("/patients/{id}/history")
@PreAuthorize("hasRole('PATIENT') or hasRole('DOCTOR')")
public ResponseEntity<?> getMedicalHistory(...) { ... }
```

**React JWT interceptor (add to all Axios calls automatically):**

```javascript
// src/services/axiosInstance.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080", // API Gateway
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
```

---

## 9. Inter-Service Communication

### Summary

| From            | To              | Method           | When                                             |
| --------------- | --------------- | ---------------- | ------------------------------------------------ |
| M4 Appointment  | M2 Doctor       | **Feign**        | Check slot availability before booking           |
| M4 Appointment  | M1 Notification | **RabbitMQ**     | After booking – send confirmation                |
| M3 Payment      | M4 Appointment  | **RabbitMQ**     | After payment – confirm appointment              |
| M4 Telemedicine | M1 Notification | **RabbitMQ**     | After session created – send URL to both parties |
| API Gateway     | All services    | **HTTP routing** | Every client request                             |

### RabbitMQ Exchange & Queue Configuration

```java
@Configuration
public class RabbitMQConfig {

    @Bean
    public TopicExchange healthcareExchange() {
        return new TopicExchange("healthcare.exchange");
    }

    @Bean
    public Queue appointmentBookedQueue() {
        return new Queue("appointment.booked.queue", true);
    }

    @Bean
    public Queue paymentConfirmedQueue() {
        return new Queue("payment.confirmed.queue", true);
    }

    @Bean
    public Binding appointmentBinding(Queue appointmentBookedQueue,
                                       TopicExchange healthcareExchange) {
        return BindingBuilder.bind(appointmentBookedQueue)
            .to(healthcareExchange)
            .with("appointment.booked");
    }
}
```

---

## 10. Docker Setup

### Dockerfile (same for every Spring Boot service)

```dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Build steps for each service:

```bash
cd curex-be/services/auth-service
mvn clean package -DskipTests
docker build -t auth-service .
```

---

### docker-compose.yml (root level – full system)

```yaml
version: '3.8'

services:

  # ─── Infrastructure ───────────────────────────────────
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"   # UI at http://localhost:15672 (guest/guest)
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password

  postgres-auth:
    image: postgres:15
    environment:
      POSTGRES_DB: auth_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    ports: ["5432:5432"]

  postgres-patient:
    image: postgres:15
    environment:
      POSTGRES_DB: patient_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    ports: ["5433:5432"]

  postgres-appointment:
    image: postgres:15
    environment:
      POSTGRES_DB: appointment_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    ports: ["5434:5432"]

  postgres-report:
    image: postgres:15
    environment:
      POSTGRES_DB: report_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    ports: ["5435:5432"]

  # ─── Services ─────────────────────────────────────────
  auth-service:
        build: ./curex-be/services/auth-service
    ports: ["8081:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-auth:5432/auth_db
      SPRING_DATASOURCE_USERNAME: admin
      SPRING_DATASOURCE_PASSWORD: secret
      JWT_SECRET: your-256-bit-secret-key-change-this-in-production
      SPRING_RABBITMQ_HOST: rabbitmq
    depends_on: [postgres-auth, rabbitmq]

  notification-service:
        build: ./curex-be/services/notification-service
    ports: ["8082:8080"]
    environment:
      SPRING_MAIL_USERNAME: yourapp@gmail.com
      SPRING_MAIL_PASSWORD: your-app-password
      SPRING_RABBITMQ_HOST: rabbitmq
    depends_on: [rabbitmq]

  patient-service:
        build: ./curex-be/services/patient-service
    ports: ["8083:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-patient:5432/patient_db
      SPRING_DATASOURCE_USERNAME: admin
      SPRING_DATASOURCE_PASSWORD: secret
    depends_on: [postgres-patient]

  appointment-service:
        build: ./curex-be/services/appointment-service
    ports: ["8088:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-appointment:5432/appointment_db
      SPRING_DATASOURCE_USERNAME: admin
      SPRING_DATASOURCE_PASSWORD: secret
      SPRING_RABBITMQ_HOST: rabbitmq
      SERVICES_DOCTOR_URL: http://doctor-service:8080
    depends_on: [postgres-appointment, rabbitmq, doctor-service]

  # Add doctor-service, report-service, payment-service, telemedicine-service
  # following the same pattern above

  api-gateway:
        build: ./curex-be/api-gateway
    ports: ["8080:8080"]
    depends_on:
      - auth-service
      - patient-service
      - appointment-service

  frontend:
        build: ./curex-fe
    ports: ["3000:80"]
    depends_on: [api-gateway]
```

**Run everything:**

```bash
docker-compose up --build       # first time (builds all images)
docker-compose up -d            # subsequent runs (background)
docker-compose logs -f          # watch all logs
docker-compose down             # stop everything
docker-compose up auth-service  # start just one service
```

### Troubleshooting: 500 on /api/doctors/by-user or Prescriptions

**Symptom:** "Request failed with status code 500" when a doctor logs in and goes to Prescriptions.

**Causes and fixes:**

1. **Doctor profile not created**  
   Doctors must create a profile (via the doctor dashboard) before using Prescriptions. If missing, you should see "Doctor not found for user id: xxx". Create a doctor profile first.

2. **Gateway cannot reach doctor-service** (500 or 503)  
   - **Full Docker:** Ensure `docker-compose up` has started doctor-service. Run `docker-compose ps` and check `curex-doctor-service`.  
   - **Mixed setup (gateway in Docker, doctor-service locally):** Set `SERVICES_DOCTOR_URL=http://host.docker.internal:8084` in `.env` and restart the gateway container.

3. **Frontend must use API Gateway**  
   Ensure `VITE_API_URL` (or the default) points to the gateway (`http://localhost:8080`), not directly to doctor-service. All API calls go through the gateway.

---

## 11. Kubernetes Setup

Use **Minikube** for local testing:

```bash
# Install Minikube, then:
minikube start
eval $(minikube docker-env)     # use Minikube's Docker daemon
docker build -t auth-service ./curex-be/services/auth-service
kubectl apply -f k8s/
kubectl get pods                # verify everything is running
kubectl get services            # see service endpoints
```

**k8s/deployments/auth-deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
        - name: auth-service
          image: auth-service:latest
          imagePullPolicy: Never # use local image in Minikube
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_DATASOURCE_URL
              value: jdbc:postgresql://postgres-auth-svc:5432/auth_db
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: jwt-secret
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service-svc
spec:
  selector:
    app: auth-service
  ports:
    - port: 8080
      targetPort: 8080
```

**Store secrets securely:**

```bash
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=your-secret-key \
  --from-literal=db-password=secret
```

Apply all K8s configs at once:

```bash
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
```

---

## 12. Sprint Plan (2–3 Weeks)

### Week 1 – Foundation

| Day | Task                                                                                   | Owner |
| --- | -------------------------------------------------------------------------------------- | ----- |
| 1   | Create GitHub repo, push folder structure, everyone clones                             | All   |
| 1   | Each member generates Spring Boot project at start.spring.io, copies into their folder | All   |
| 1–2 | M1: Build auth-service – register, login, JWT filter working                           | M1    |
| 2–3 | M2: Patient + Doctor CRUD with JPA connected to PostgreSQL                             | M2    |
| 2–3 | M3: Report upload endpoint + file storage working                                      | M3    |
| 2–3 | M4: Appointment entity + basic CRUD endpoints                                          | M4    |
| 3   | Docker Compose runs all services – everyone confirms their service starts              | All   |

> **Critical:** M1 must complete JWT login by Day 2. All other members are blocked on secured endpoints until then. Use unsecured endpoints first for local testing.

---

### Week 2 – Core Features

| Day | Task                                                                                    | Owner        |
| --- | --------------------------------------------------------------------------------------- | ------------ |
| 4–5 | M1: Admin dashboard endpoints, notification-service, RabbitMQ consumer                  | M1           |
| 4–5 | M2: Availability scheduling, prescription endpoints, AI symptom checker                 | M2           |
| 5–6 | M3: PayHere sandbox integration, webhook handler, RabbitMQ event publish                | M3           |
| 4–6 | M4: Full booking flow (Feign → doctor-service for availability), RabbitMQ event publish | M4           |
| 6–7 | React: Login/register pages connected to real auth-service                              | All frontend |
| 7   | API Gateway routing configured for all services                                         | Shared       |

---

### Week 3 – Integration & Submission

| Day   | Task                                                                                          | Owner        |
| ----- | --------------------------------------------------------------------------------------------- | ------------ |
| 8–9   | M4: Telemedicine session generation, session URL sent via RabbitMQ                            | M4           |
| 8–9   | React: All dashboard pages connected to APIs                                                  | All frontend |
| 9–10  | End-to-end test: Register → book appointment → pay → join video call                          | All          |
| 10–11 | K8s YAML files written, `kubectl apply` runs full system                                      | All          |
| 11–12 | Report PDF written: architecture diagram, endpoint lists, workflow diagrams, security section | All          |
| 12–13 | Demo video recorded (max 12 min total, 3 min per member)                                      | All          |
| 13    | Zip file created, submission.txt written, uploaded                                            | One member   |

---

## 13. Assignment Deliverables Checklist

| Deliverable      | Details                                             | Done? |
| ---------------- | --------------------------------------------------- | ----- |
| `submission.txt` | GitHub repo link + YouTube demo video link          | ☐     |
| `readme.txt`     | Step-by-step deployment instructions                | ☐     |
| `members.txt`    | Names, registration numbers, IDs of all members     | ☐     |
| `report.pdf`     | See below                                           | ☐     |
| Source code      | All services + frontend in correct folder structure | ☐     |

**report.pdf must include:**

- [ ] High-level architectural diagram showing all services and interconnectivity
- [ ] List of all service interfaces (REST endpoints) per service
- [ ] Workflow diagrams: booking flow, auth flow, payment flow, telemedicine flow
- [ ] Authentication/security section: JWT, BCrypt, RBAC, `@PreAuthorize`
- [ ] Individual contributions per member
- [ ] Appendix: all written code as **text** (not screenshots – penalised if screenshots used)

**Zip file name:** `GroupID_DS-Assignment.zip`

**Turnitin similarity must be under 20%** – write the report in your own words. Do not copy from documentation.

---

## Quick Reference – Ports & URLs

| Service                | Local URL                               |
| ---------------------- | --------------------------------------- |
| React Frontend         | http://localhost:3000                   |
| API Gateway            | http://localhost:8080                   |
| Auth Service           | http://localhost:8081                   |
| Notification Service   | http://localhost:8082                   |
| Patient Service        | http://localhost:8083                   |
| Doctor Service         | http://localhost:8084                   |
| AI Symptom Service     | http://localhost:8085                   |
| Report Service         | http://localhost:8086                   |
| Payment Service        | http://localhost:8087                   |
| Appointment Service    | http://localhost:8088                   |
| Telemedicine Service   | http://localhost:8089                   |
| RabbitMQ Management UI | http://localhost:15672 (admin/password) |

---

_SE3020 Distributed Systems – Group Project Guide | Generated for team use_
