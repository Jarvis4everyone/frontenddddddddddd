# Multi-stage build for integrated Node.js + React application
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build arguments for API URL (for Vite build)
# In integrated deployment, these should point to the same service URL
ARG VITE_API_URL
ARG VITE_API_BASE_URL

# Set as environment variables for Vite build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the React frontend
RUN npm run build

# Production stage - Use Node.js to serve both API and frontend
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy backend source code
COPY server.js ./
COPY backend ./backend

# Copy downloads folder (contains jarvis4everyone.zip)
COPY .downloads ./.downloads

# Expose port (Render will set PORT environment variable)
EXPOSE 5000

# Start the integrated server
CMD ["node", "server.js"]
