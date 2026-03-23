# ── Stage 1: Build ───────────────────────────────────────────────────────────
# maven:3.9-eclipse-temurin-17 has both JDK 17 and Maven pre-installed
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy pom.xml first so Maven dependency layer is cached separately from source
COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src
RUN mvn clean package -DskipTests -q

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# eclipse-temurin:17-jre-jammy — JRE only, ~200 MB smaller than JDK image
FROM eclipse-temurin:17-jre-jammy AS runtime

# curl is needed for the Docker Compose healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Run as non-root for security
RUN groupadd --system curex && useradd --system --gid curex curex

WORKDIR /app

COPY --from=build /app/target/user-service-1.0.0.jar app.jar

RUN chown curex:curex app.jar
USER curex

EXPOSE 8081

ENV SPRING_PROFILES_ACTIVE=docker

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
