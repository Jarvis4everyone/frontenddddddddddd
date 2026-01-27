# Deployment Guide - Integrated Backend + Frontend

## ✅ CONFIRMED: Multiple Users Can Use Simultaneously

**YES!** Your application supports **unlimited concurrent users** because:

1. **Express.js is Asynchronous**: Node.js/Express handles multiple requests concurrently using event-driven, non-blocking I/O
2. **Stateless Authentication**: JWT tokens are stateless - each user's session is independent
3. **MongoDB Connection Pooling**: MongoDB driver automatically handles multiple concurrent database connections
4. **No Session Storage**: No server-side session storage means no user limits

## 🚀 Deployment Architecture

### Single Integrated Service

Your application is **fully integrated** - both backend and frontend run from the same Node.js server:

- **Backend API**: `/api/*` routes (auth, profile, subscription, payment, download, contact, admin)
- **Frontend**: All other routes serve the React app (`dist/index.html`)
- **Single Port**: One service, one port, one URL

### How It Works

1. **Development**: 
   - Frontend runs on Vite dev server (port 3000)
   - Backend runs on Express (port 5000)
   - Vite proxy forwards `/api/*` to backend

2. **Production**:
   - `npm run build` creates `dist/` folder with React app
   - `npm start` runs Express server
   - Express serves:
     - Static files from `dist/` for frontend
     - API routes from `/api/*` for backend

## 📋 Render Deployment Steps

### 1. Environment Variables

Set these in Render Dashboard → Your Service → Environment:

```
NODE_ENV=production
PORT=5000
DEBUG=false

MONGODB_URL=your_mongodb_connection_string
DATABASE_NAME=saas_subscription_db

JWT_SECRET_KEY=your_strong_random_secret_key_min_32_chars
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

CORS_ORIGINS=https://your-service-name.onrender.com
SUBSCRIPTION_PRICE=299.0
DOWNLOAD_FILE_PATH=./.downloads/jarvis4everyone.zip

# IMPORTANT: Set these to your Render service URL AFTER first deployment
# You'll get the URL like: https://jarvis4everyone.onrender.com
VITE_API_URL=https://your-service-name.onrender.com
VITE_API_BASE_URL=https://your-service-name.onrender.com
```

### 2. Build Configuration

The Dockerfile automatically:
1. Builds the React frontend with Vite
2. Installs Node.js dependencies
3. Starts the integrated Express server

### 3. Deployment Process

1. **First Deployment**:
   - Deploy without `VITE_API_URL` and `VITE_API_BASE_URL`
   - Get your service URL (e.g., `https://jarvis4everyone.onrender.com`)
   - Add `VITE_API_URL` and `VITE_API_BASE_URL` with your service URL
   - Redeploy to rebuild with correct API URL

2. **Subsequent Deployments**:
   - Just push to your connected Git repository
   - Render will automatically build and deploy

### 4. Health Check

- Health check endpoint: `/health`
- Render uses this to verify your service is running

## 🔒 Security Notes

1. **JWT Secret**: Use a strong, random 32+ character string
   - Generate: `openssl rand -base64 32`

2. **MongoDB**: Use MongoDB Atlas with:
   - IP whitelist (add Render's IP ranges)
   - Strong password
   - Network access restrictions

3. **CORS**: Set `CORS_ORIGINS` to your actual domain(s)
   - For Render: `https://your-service-name.onrender.com`

4. **Environment Variables**: Never commit `.env` file
   - All secrets should be in Render Dashboard only

## 📊 Performance & Scaling

### Concurrent Users

- **Free Tier**: Handles multiple users simultaneously
- **Paid Tiers**: Better performance, more resources
- **No Hard Limits**: Application architecture supports unlimited concurrent users

### Database

- MongoDB Atlas free tier: 512MB storage
- Connection pooling: Automatic
- Indexes: Already configured for optimal performance

### File Downloads

- Download file should be in `.downloads/` folder
- Ensure file exists before deployment
- Consider using cloud storage (S3, etc.) for large files

## 🐛 Troubleshooting

### Build Fails

- Check Node.js version (requires 18+)
- Verify all environment variables are set
- Check build logs in Render dashboard

### API Not Working

- Verify `CORS_ORIGINS` includes your service URL
- Check MongoDB connection string
- Verify JWT_SECRET_KEY is set

### Frontend Not Loading

- Check if `dist/` folder was created during build
- Verify `VITE_API_URL` points to your service URL
- Check browser console for errors

## 📝 Notes

- **Single Service**: Everything runs on one Render service
- **No Separate Backend**: No need for separate backend service
- **Cost Effective**: One service = one bill
- **Easy Management**: One service to monitor and maintain
