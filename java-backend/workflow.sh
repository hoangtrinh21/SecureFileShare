#!/bin/bash

# Navigate to Java backend directory
cd java-backend

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Reset to correct JDK version
export JAVA_HOME=/nix/store/05jas4f42z7nyn4xidm5b8dfqkkxhj5f-openjdk-17.0.9+9/lib/openjdk

# Build the application with Maven
echo "Building Java Spring Boot application..."
./mvnw clean install -DskipTests

# Run the Spring Boot application
echo "Starting Java Spring Boot application..."
./mvnw spring-boot:run