# Jarvis4Everyone - Frontend

Frontend application for Jarvis4Everyone built with React, Vite, and React Router.

## Features

- User authentication (Login/Signup)
- Dashboard with subscription status and expiry checking
- Profile management with subscription cancellation
- File downloads (requires active subscription with expiry validation)
- Protected routes with automatic authentication
- Automatic token refresh on 401 errors
- Enhanced subscription status checking (validates expiry dates)
- Health check API integration

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Backend API running on `http://localhost:8000`

## Installation

1. Install dependencies:
```bash
npm install
```

2. Make sure the backend API is running

3. Configure the backend URL in `.env` file:
   - Copy `.env.example` to `.env` (if it doesn't exist)
   - Update `VITE_API_BASE_URL` with your backend server URL
   - Default is `http://localhost:8000`

## Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable components
│   ├── Layout.jsx   # Main layout with navigation
│   └── ProtectedRoute.jsx  # Route protection
├── contexts/         # React contexts
│   └── AuthContext.jsx  # Authentication state management
├── pages/           # Page components
│   ├── Login.jsx
│   ├── Signup.jsx
│   ├── Dashboard.jsx
│   ├── Profile.jsx
│   └── Downloads.jsx
├── services/        # API services
│   └── api.js       # Axios instance and API functions
├── App.jsx          # Main app component with routing
└── main.jsx         # Entry point
```

## API Integration

The frontend integrates with the backend API documented in `API_DOCUMENTATION.md`. Key features:

- JWT authentication with automatic token refresh
- HttpOnly cookie support for refresh tokens
- Subscription status management
- File download functionality

## Environment Configuration

The API base URL is configured via environment variables in the `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
```

- Create a `.env` file in the root directory (copy from `.env.example`)
- Set `VITE_API_BASE_URL` to your backend server URL
- The `.env` file is gitignored and won't be committed
- For production, set the environment variable in your deployment platform

## Notes

- Access tokens are stored in localStorage
- Refresh tokens are handled automatically via HttpOnly cookies
- All protected routes require authentication
- Subscription status is checked before allowing downloads
- Subscription expiry dates are validated (not just status field)
- 404 errors on subscription endpoints mean "no subscription" (user still authenticated)
- Automatic token refresh with retry logic on 401 errors

