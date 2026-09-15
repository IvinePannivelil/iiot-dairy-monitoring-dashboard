# Stage 1: Build the React application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the app for production
ARG VITE_INFLUX_URL
ARG VITE_INFLUX_TOKEN
ARG VITE_INFLUX_ORG
ARG VITE_INFLUX_BUCKET
ARG VITE_NODERED_WS_URL
ARG VITE_IIH_BASE_URL

ENV VITE_INFLUX_URL=$VITE_INFLUX_URL
ENV VITE_INFLUX_TOKEN=$VITE_INFLUX_TOKEN
ENV VITE_INFLUX_ORG=$VITE_INFLUX_ORG
ENV VITE_INFLUX_BUCKET=$VITE_INFLUX_BUCKET
ENV VITE_NODERED_WS_URL=$VITE_NODERED_WS_URL
ENV VITE_IIH_BASE_URL=$VITE_IIH_BASE_URL

RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to handle React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 to the host
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
