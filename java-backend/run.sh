#!/bin/bash

# Ensure the upload directory exists
mkdir -p uploads

# Build the application using Maven
echo "Building the application..."
mvn clean package -DskipTests

# Run the application
echo "Starting the application..."
java -jar target/file-share-api-0.0.1-SNAPSHOT.jar