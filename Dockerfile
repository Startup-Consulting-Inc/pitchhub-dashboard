# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Build arguments for frontend
ARG PROJECT_ID
ENV PROJECT_ID=$PROJECT_ID

COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - serve with Node.js for Cloud Run
FROM node:18-alpine

WORKDIR /app

# Install serve to host the static files
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start the application with SPA fallback
CMD ["serve", "-s", "dist", "-l", "8080"]