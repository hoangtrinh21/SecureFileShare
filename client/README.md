
# FileShare Frontend

A React-based frontend for the one-time file sharing platform.

## Prerequisites

- Node.js
- npm

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Create a `.env` file in the root directory with:
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

3. Start the development server:
```bash
npm run dev
```

The application will start on port 5000 and can be accessed at `http://localhost:5000`

## Features

- Google Authentication
- File upload with 2MB limit
- One-time file downloads
- Dynamic connection codes
- Mobile-responsive design

## Tech Stack

- React
- Vite
- TailwindCSS
- shadcn/ui components
- React Query
- Wouter for routing
