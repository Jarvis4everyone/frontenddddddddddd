# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build arguments for API URL (support both naming conventions)
ARG VITE_API_URL=https://backend-gchd.onrender.com
ARG VITE_API_BASE_URL=https://backend-gchd.onrender.com

# Set as environment variables for Vite build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
