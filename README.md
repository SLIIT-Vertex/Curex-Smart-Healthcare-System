# Curex Healthcare Platform Monorepo

This repository contains the frontend and backend scaffold for the healthcare platform.

## Repository Structure

```text
Curex/
├ Makefile
├ README.md
├ curex-fe/
│   ├ package.json
│   ├ src/
│   └ ...
├ curex-be/
│   ├ api-gateway/
│   │   └ src/main/
│   │       ├ java/
│   │       └ resources/
│   └ services/
│       ├ auth-service/
│       │   └ src/main/java/com/healthcare/auth/
│       │       ├ controller/
│       │       ├ service/
│       │       ├ repository/
│       │       ├ entity/
│       │       ├ dto/
│       │       └ security/
│       ├ notification-service/
│       ├ patient-service/
│       ├ doctor-service/
│       ├ ai-symptom-service/
│       ├ report-service/
│       ├ payment-service/
│       ├ appointment-service/
│       └ telemedicine-service/
├ k8s/
│   ├ deployments/
│   └ services/
└ docs/
```

## Prerequisites

Install these tools before running the project:

- Node.js 18+ and npm
- Java 17+
- Maven 3.9+
- Docker + Docker Compose
- Git

Optional for Kubernetes:

- kubectl
- Minikube

## Makefile Introduction (For Teammates)

`make` lets us run common project commands using short, consistent names.
Instead of remembering long commands, everyone can run the same Make targets from the repository root.

Why we use it:

- One shared way to run frontend commands
- No need to manually `cd` into `curex-fe`
- Fewer command mistakes across the team

Check available commands:

```bash
make
```

Current commands:

- `make fe-install` - install frontend dependencies
- `make fe` - start frontend dev server
- `make fe-dev` - start frontend dev server
- `make fe-build` - create production build
- `make fe-preview` - preview production build

If `make` is not available:

- macOS: install Command Line Tools with `xcode-select --install`
- Linux: install `make` via your package manager
- Windows: use Git Bash/WSL or install `make` via Chocolatey/MSYS2

## Frontend Setup (from repository root)

The root `Makefile` provides shortcuts to run frontend commands without changing directories.

1. Install frontend dependencies:

```bash
make fe-install
```

2. Start frontend development server:

```bash
make fe-dev
```

3. Build frontend for production:

```bash
make fe-build
```

4. Preview production build:

```bash
make fe-preview
```

## Manual Frontend Commands (without Makefile)

If needed, you can run directly:

```bash
cd curex-fe
npm install
npm run dev
```

## Backend Scaffold Notes

The backend folder currently contains scaffold directories and `.gitkeep` files for:

- `api-gateway`
- `services/*` microservices
- `k8s/deployments` and `k8s/services`
- `docs`

Next implementation step is adding per-service starter files such as:

- `pom.xml`
- `Dockerfile`
- `src/main/resources/application.properties` (or `application.yml`)
- Spring Boot main application classes

## Suggested Next Commands

From root:

```bash
# frontend
make fe-install
make fe-dev

# verify folder scaffold
find curex-be -type d | sort
```

## Team Guide

Detailed architecture and team workflow are documented in:

- `docs/DEVERLOPER_GUIDE.md`
