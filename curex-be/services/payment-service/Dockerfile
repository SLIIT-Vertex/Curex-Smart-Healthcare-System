# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy pom.xml first so Maven dependency layer is cached separately from source
COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src
RUN mvn clean package -DskipTests -q

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-jammy AS runtime

# curl is needed for the Docker Compose healthcheck
RUN sed -i 's|http://archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g; s|http://security.ubuntu.com/ubuntu|https://security.ubuntu.com/ubuntu|g' /etc/apt/sources.list \
    && apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Run as non-root for security
RUN groupadd --system curex && useradd --system --gid curex curex

WORKDIR /app

# Ensure the jar name matches pom.xml (artifactId-version.jar)
COPY --from=build /app/target/payment-service-0.0.1-SNAPSHOT.jar app.jar

RUN chown curex:curex app.jar
USER curex

EXPOSE 8087

ENV SPRING_PROFILES_ACTIVE=docker

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
