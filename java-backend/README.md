# One-time File Sharing API

A Java Spring Boot backend for the one-time file sharing platform with secure authentication and dynamic connection codes.

## Features

- Secure file sharing with one-time downloads
- Google authentication
- Dynamic connection code generation
- Exponential backoff for failed attempts
- File size limit of 2MB

## Technologies Used

- Java 17
- Spring Boot 3.1.5
- Spring Security
- Spring Data JPA
- PostgreSQL
- OAuth2

## Getting Started

### Prerequisites

- Java 17 or higher
- PostgreSQL database
- Maven

### Configuration

Update the application properties in `src/main/resources/application.properties` with your database connection details and Google OAuth2 credentials.

### Building the Application

```bash
mvn clean package
```

### Running the Application

```bash
java -jar target/file-share-api-0.0.1-SNAPSHOT.jar
```

## API Endpoints

### Authentication

- `POST /api/auth/google`: Authenticate with Google
- `GET /api/auth/me`: Get current authenticated user
- `POST /api/auth/logout`: Logout current user

### File Operations

- `POST /api/files/upload`: Upload a file
- `POST /api/files/verify`: Verify connection code
- `GET /api/files/download/{token}`: Download a file
- `POST /api/files/downloaded`: Mark file as downloaded

## Security

The application implements several security measures:

1. Google OAuth for authentication
2. One-time download links that expire in 3 minutes
3. Dynamic connection code generation that adapts code length based on system load
4. Exponential backoff for failed attempts to prevent brute force attacks
5. Protection against uploaders downloading their own files