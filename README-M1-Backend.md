# Curex Healthcare Platform - Member 1 (M1) Backend Services

## Overview

This repository contains the backend services developed for **Member 1 (M1)** responsibilities in the Curex Healthcare Platform project. The M1 services include:

- **Auth Service** - User authentication, JWT token management, and user registration
- **Admin Service** - User management, doctor approval, and platform statistics
- **Notification Service** - Email and SMS notifications with RabbitMQ integration

## Architecture

### Tech Stack

- **Backend**: Spring Boot 3.2.2 with Java 17
- **Database**: PostgreSQL 15
- **Message Broker**: RabbitMQ
- **Caching**: Redis
- **Service Discovery**: Eureka Server
- **API Gateway**: Nginx
- **Containerization**: Docker & Docker Compose
- **Security**: JWT with BCrypt password hashing
- **Email**: JavaMailSender with Thymeleaf templates
- **SMS**: Twilio SDK

### Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx API Gateway                        │
│                        (Port 80)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
┌────────▼───┐ ┌──────▼───┐ ┌──────▼─────────┐
│Auth Service│ │  Admin   │ │  Notification  │
│ (Port 8080)│ │ Service  │ │   Service      │
│            │ │(Port 8081)│ │ (Port 8082)   │
└─────┬──────┘ └─────┬────┘ └──────┬─────────┘
      │              │             │
      └──────────────┼─────────────┘
                     │
              ┌──────▼──────┐
              │ PostgreSQL  │
              │ (Port 5432) │
              └─────────────┘
```

## Project Structure

```
curex-be/
├── services/
│   ├── auth-service/           # Authentication & Authorization
│   │   ├── src/main/java/com/healthcare/auth/
│   │   │   ├── controller/     # REST Controllers
│   │   │   ├── service/        # Business Logic
│   │   │   ├── repository/     # Data Access
│   │   │   ├── entity/         # JPA Entities
│   │   │   ├── dto/           # Data Transfer Objects
│   │   │   └── security/      # JWT & Security Config
│   │   └── Dockerfile
│   │
│   ├── admin-service/         # User & Doctor Management
│   │   ├── src/main/java/com/healthcare/admin/
│   │   └── Dockerfile
│   │
│   └── notification-service/  # Email & SMS Notifications
│       ├── src/main/java/com/healthcare/notification/
│       └── Dockerfile
│
├── docker-compose.yml         # Production deployment
├── docker-compose.dev.yml     # Development infrastructure
└── docker/
    ├── init-db.sql           # Database initialization
    └── nginx.conf            # API Gateway configuration
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Java 17+ (for local development)
- Maven 3.8+ (for local development)

### 1. Production Deployment (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Curex

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your actual configuration values

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access services
# - API Gateway: http://localhost
# - RabbitMQ Management: http://localhost:15672 (guest/guest)
# - Auth Service Health: http://localhost:8080/api/auth/health
# - Admin Service Health: http://localhost:8081/api/admin/health
# - Notification Service Health: http://localhost:8082/api/notifications/health
```

### 2. Development Setup

```bash
# Start only infrastructure services
docker-compose -f docker-compose.dev.yml up -d

# This provides:
# - PostgreSQL: localhost:5432
# - RabbitMQ: localhost:5672 (Management UI: localhost:15672)
# - Redis: localhost:6379
# - MailHog (Email testing): localhost:8025

# Run services individually in your IDE or command line
cd curex-be/services/auth-service
mvn spring-boot:run

cd curex-be/services/admin-service
mvn spring-boot:run

cd curex-be/services/notification-service
mvn spring-boot:run
```

## Configuration

### Environment Variables

| Variable              | Description         | Default          |
| --------------------- | ------------------- | ---------------- |
| `DB_USERNAME`         | Database username   | `curex_user`     |
| `DB_PASSWORD`         | Database password   | `curex_password` |
| `JWT_SECRET`          | JWT signing secret  | -                |
| `MAIL_USERNAME`       | SMTP email username | -                |
| `MAIL_PASSWORD`       | SMTP email password | -                |
| `TWILIO_ACCOUNT_SID`  | Twilio account SID  | -                |
| `TWILIO_AUTH_TOKEN`   | Twilio auth token   | -                |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | -                |

### Email Configuration (Gmail Example)

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password  # Generate from Google Account settings
```

### SMS Configuration (Twilio)

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get Account SID, Auth Token, and Phone Number
3. Update environment variables

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

## API Endpoints

### Auth Service (Port 8080)

| Method | Endpoint             | Description              | Auth Required |
| ------ | -------------------- | ------------------------ | ------------- |
| POST   | `/api/auth/register` | User registration        | No            |
| POST   | `/api/auth/login`    | User login               | No            |
| POST   | `/api/auth/refresh`  | Refresh JWT token        | No            |
| POST   | `/api/auth/validate` | Validate JWT token       | No            |
| GET    | `/api/auth/profile`  | Get current user profile | Yes           |
| POST   | `/api/auth/logout`   | Logout (client-side)     | Yes           |

### Admin Service (Port 8081)

| Method | Endpoint                       | Description                     | Auth Required |
| ------ | ------------------------------ | ------------------------------- | ------------- |
| GET    | `/api/admin/users`             | Get all users (paginated)       | Admin         |
| GET    | `/api/admin/users/{id}`        | Get user by ID                  | Admin         |
| GET    | `/api/admin/doctors/pending`   | Get pending doctor applications | Admin         |
| PUT    | `/api/admin/users/{id}/status` | Approve/reject user             | Admin         |
| PUT    | `/api/admin/users/bulk-status` | Bulk approve/reject users       | Admin         |
| GET    | `/api/admin/statistics`        | Get platform statistics         | Admin         |
| DELETE | `/api/admin/users/{id}`        | Suspend user account            | Admin         |

### Notification Service (Port 8082)

| Method | Endpoint                         | Description                | Auth Required |
| ------ | -------------------------------- | -------------------------- | ------------- |
| POST   | `/api/notifications/send`        | Send notification (sync)   | Yes           |
| POST   | `/api/notifications/send-async`  | Send notification (async)  | Yes           |
| GET    | `/api/notifications/user/{id}`   | Get user notifications     | Yes           |
| GET    | `/api/notifications/{id}`        | Get notification by ID     | Yes           |
| GET    | `/api/notifications`             | Get filtered notifications | Yes           |
| PUT    | `/api/notifications/{id}/cancel` | Cancel notification        | Yes           |

## Database Schema

### Users Table (Auth & Admin Services)

```sql
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(20) NOT NULL,
    account_status VARCHAR(20) DEFAULT 'PENDING',
    email_verified BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(255),
    approval_notes TEXT,
    approval_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);
```

### Notifications Table

```sql
CREATE TABLE notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    content TEXT,
    template_name VARCHAR(100),
    template_data TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    sent_at TIMESTAMP,
    delivery_attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    error_message TEXT,
    external_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);
```

## RabbitMQ Events

The Notification Service listens for these events:

| Queue                        | Description              | Payload Fields                                               |
| ---------------------------- | ------------------------ | ------------------------------------------------------------ |
| `user.registration.queue`    | New user registered      | `userId`, `email`, `firstName`, `role`, `phoneNumber`        |
| `appointment.booking.queue`  | Appointment booked       | `patientId`, `patientEmail`, `doctorName`, `appointmentDate` |
| `doctor.approval.queue`      | Doctor approved/rejected | `doctorId`, `email`, `firstName`, `status`, `notes`          |
| `payment.confirmation.queue` | Payment confirmed        | `patientId`, `patientEmail`, `amount`, `appointmentId`       |

## Monitoring & Health Checks

### Health Endpoints

- Auth Service: `GET /api/auth/health`
- Admin Service: `GET /api/admin/health`
- Notification Service: `GET /api/notifications/health`
- API Gateway: `GET /health`

### Management Endpoints (Actuator)

Each service exposes Spring Boot Actuator endpoints at `/actuator/*`:

- `/actuator/health` - Detailed health information
- `/actuator/metrics` - Application metrics
- `/actuator/info` - Application information

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f auth-service
docker-compose logs -f admin-service
docker-compose logs -f notification-service
```

## Development

### Building Services

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build auth-service

# Build without cache
docker-compose build --no-cache
```

### Running Tests

```bash
cd curex-be/services/auth-service
mvn test

cd curex-be/services/admin-service
mvn test

cd curex-be/services/notification-service
mvn test
```

### Database Migrations

The services use Hibernate's `ddl-auto: update` for development. For production, consider using Flyway or Liquibase for controlled migrations.

## Security

- JWT tokens for authentication
- BCrypt for password hashing
- CORS configuration for frontend integration
- Rate limiting via Nginx
- Input validation with Spring Validation
- SQL injection prevention with JPA/Hibernate

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   ```bash
   # Check if PostgreSQL is running
   docker-compose ps postgres
   # Check logs
   docker-compose logs postgres
   ```

2. **RabbitMQ Connection Issues**

   ```bash
   # Check RabbitMQ status
   docker-compose ps rabbitmq
   # Access management UI
   open http://localhost:15672
   ```

3. **Email Not Sending**
   - Verify SMTP credentials
   - Check if less secure apps are enabled (Gmail)
   - Use app passwords for Gmail
   - Check MailHog in development: http://localhost:8025

4. **SMS Not Sending**
   - Verify Twilio credentials
   - Check Twilio console for errors
   - Ensure phone numbers are in correct format

### Debugging

```bash
# Check service health
curl http://localhost:8080/api/auth/health
curl http://localhost:8081/api/admin/health
curl http://localhost:8082/api/notifications/health

# Check container status
docker-compose ps

# View detailed logs
docker-compose logs -f --tail=100 auth-service
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add some feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is part of the SE3020 coursework for Curex Healthcare Platform.

---

**Member 1 (M1) Services - Auth, Admin & Notification**
**Curex Healthcare Platform**
**SE3020 - Software Engineering Project**
