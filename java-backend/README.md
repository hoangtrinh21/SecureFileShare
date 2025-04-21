
# File Share Backend

A Java Spring Boot backend for one-time file sharing with secure authentication and dynamic connection codes.

## Prerequisites

- Java 17
- Maven
- PostgreSQL database

## Setup

1. Configure environment variables in `application.properties`:
   ```
   DATABASE_URL=your_database_url
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

2. Create uploads directory:
   ```bash
   mkdir -p uploads
   ```

## Running the Application

There are two ways to run the application:

### Using run.sh script

```bash
chmod +x run.sh
./run.sh
```

### Using Maven directly

1. Build the application:
   ```bash
   mvn clean package -DskipTests
   ```

2. Run the application:
   ```bash
   java -jar target/file-share-api-0.0.1-SNAPSHOT.jar
   ```

The application will start on port 8080.

## API Endpoints

- `POST /api/auth/google`: Google authentication
- `GET /api/auth/me`: Get current user
- `POST /api/auth/logout`: Logout
- `POST /api/files/upload`: Upload file
- `POST /api/files/verify`: Verify connection code
- `GET /api/files/download/{token}`: Download file
- `POST /api/files/downloaded`: Mark file as downloaded

## Features

- Secure file sharing with one-time downloads
- Google authentication
- Dynamic connection codes
- File size limit: 2MB
- Connection code expiry: 10 minutes
- Exponential backoff for failed attempts
