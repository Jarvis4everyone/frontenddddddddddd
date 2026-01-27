# Jarvis4Everyone - Full-Stack Application

A complete full-stack application with React frontend and Node.js/Express backend, integrated into a single deployable project.

## 🚀 Features

- **User Authentication**: JWT-based authentication with access tokens and refresh tokens
- **Subscription Management**: Monthly subscription plans with expiry tracking
- **Payment Integration**: Razorpay payment gateway integration
- **File Downloads**: Secure file downloads for subscribed users
- **Admin Panel**: Complete admin interface for user, subscription, and payment management
- **Contact System**: Contact form with admin management
- **Profile Management**: User profile updates and dashboard

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: MongoDB database (local or cloud instance like MongoDB Atlas)
- **Razorpay Account**: For payment processing (optional for development)

## 🛠️ Installation

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Create a `.env` file in the root directory
   - Copy the following template and fill in your values:

   ```env
   # MongoDB Configuration
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=saas_subscription_db

   # JWT Configuration
   JWT_SECRET_KEY=your-secret-key-change-this-in-production
   ACCESS_TOKEN_EXPIRE_MINUTES=15
   REFRESH_TOKEN_EXPIRE_DAYS=7

   # Razorpay Configuration
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret
   RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret

   # Application Configuration
   NODE_ENV=development
   PORT=5000
   DEBUG=true

   # CORS Configuration
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173

   # Download Configuration
   DOWNLOAD_FILE_PATH=./.downloads/jarvis4everyone.zip

   # Subscription Configuration
   SUBSCRIPTION_PRICE=299.0
   ```

4. **Set up MongoDB**:
   - Ensure MongoDB is running locally, or
   - Use MongoDB Atlas and update `MONGODB_URL` in `.env`

5. **Prepare download file** (optional):
   - Create a `.downloads` folder in the project root
   - Place `jarvis4everyone.zip` in that folder
   - Or update `DOWNLOAD_FILE_PATH` in `.env` to point to your file location

## 🏃 Running the Application

### Development Mode

Run both frontend and backend concurrently:
```bash
npm run dev
```

This will start:
- **Backend server** on `http://localhost:5000`
- **Frontend dev server** on `http://localhost:3000`

### Development Mode (Separate Terminals)

If you prefer to run them separately:

**Terminal 1 - Backend:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
npm run dev:client
```

### Production Mode

1. **Build the frontend**:
   ```bash
   npm run build
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

   The server will serve the built React app and handle API requests on the same port (default: 5000).

## 📁 Project Structure

```
.
├── backend/                 # Node.js backend
│   ├── config/            # Configuration files
│   │   ├── index.js       # Main config
│   │   └── database.js    # MongoDB connection
│   ├── middleware/        # Express middleware
│   │   └── auth.js        # Authentication middleware
│   ├── routes/            # API routes
│   │   ├── auth.js        # Authentication routes
│   │   ├── profile.js     # Profile routes
│   │   ├── subscription.js # Subscription routes
│   │   ├── payment.js     # Payment routes
│   │   ├── download.js    # Download routes
│   │   ├── contact.js     # Contact routes
│   │   └── admin.js       # Admin routes
│   ├── services/          # Business logic
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── subscriptionService.js
│   │   ├── paymentService.js
│   │   └── contactService.js
│   └── utils/             # Utility functions
│       ├── logger.js
│       ├── security.js
│       └── subscription.js
├── src/                    # React frontend
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── pages/             # Page components
│   ├── services/          # API services
│   └── config/            # Configuration
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
└── .env                   # Environment variables (create this)
```

## 🔌 API Endpoints

All API endpoints are prefixed with `/api`:

- **Authentication**: `/api/auth/*`
- **Profile**: `/api/profile/*`
- **Subscriptions**: `/api/subscriptions/*`
- **Payments**: `/api/payments/*`
- **Downloads**: `/api/download/*`
- **Contact**: `/api/contact/*`
- **Admin**: `/api/admin/*`

See `backendcodedontusejustlearn/API_DOCUMENTATION.md` for complete API documentation.

## 🔐 Authentication Flow

1. User registers or logs in
2. Backend returns access token in response body
3. Refresh token is automatically set in HttpOnly cookie
4. Frontend stores access token in localStorage
5. Include access token in all protected requests: `Authorization: Bearer <access_token>`
6. When access token expires, use `/api/auth/refresh` to get a new one

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Root Endpoint
```bash
curl http://localhost:5000/api/
```

## 🚢 Deployment

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform:

- `MONGODB_URL`: Your production MongoDB connection string
- `JWT_SECRET_KEY`: A strong, random secret key
- `RAZORPAY_KEY_ID`: Your Razorpay key ID
- `RAZORPAY_KEY_SECRET`: Your Razorpay key secret
- `RAZORPAY_WEBHOOK_SECRET`: Your Razorpay webhook secret
- `NODE_ENV`: Set to `production`
- `PORT`: Port number (usually set by hosting platform)
- `CORS_ORIGINS`: Your production frontend URL(s)

### Build and Deploy

1. Build the application:
   ```bash
   npm run build
   ```

2. The `dist/` folder contains the built React app
3. The server will automatically serve it in production mode

### Platform-Specific Notes

- **Render/Railway/Heroku**: Set environment variables in the platform dashboard
- **Vercel/Netlify**: For serverless, you may need to separate frontend and backend
- **Docker**: Create a Dockerfile (see below)

## 🐳 Docker Support

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

## 📝 Notes

- **Access Tokens**: Stored in localStorage (15-minute expiry)
- **Refresh Tokens**: Stored in HttpOnly cookies (7-day expiry)
- **CORS**: Configured to allow credentials
- **MongoDB Indexes**: Automatically created on startup
- **Subscription Expiry**: Checked on user login
- **Password Reset**: Logs user out from all devices

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify `MONGODB_URL` is correct
- Check if MongoDB is running
- Ensure network access is allowed (for cloud MongoDB)

### CORS Errors
- Add your frontend URL to `CORS_ORIGINS` in `.env`
- Ensure `credentials: true` is set in frontend requests

### Token Refresh Issues
- Check if cookies are enabled in browser
- Verify `withCredentials: true` in axios requests
- Check cookie settings in production (secure, sameSite)

### Download File Not Found
- Verify `DOWNLOAD_FILE_PATH` in `.env`
- Check file exists at the specified path
- Ensure file permissions are correct

## 📄 License

[Your License Here]

## 👥 Support

For questions or issues, please contact the development team.

---

**Built with ❤️ using React, Node.js, Express, and MongoDB**
