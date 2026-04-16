# syntax=docker/dockerfile:1

# React Native Expo Mobile App Dockerfile
# Adapted for development and web export of Expo-based mobile applications

ARG NODE_VERSION=24.11.1

FROM node:${NODE_VERSION}-alpine

# Set environment for Expo development
ENV NODE_ENV=development \
    SKIP_ENV_VALIDATION=true \
    EXPO_DEBUG=false

WORKDIR /usr/src/app

# Install app dependencies including dev dependencies required for Expo CLI and build tools
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code
COPY . .

# Expose Expo development server ports
# 8081: Expo Metro bundler (web) - primary development port
# 19000: Expo development server (physical devices/simulators)
# 19001: Expo bundler port (alt)
EXPOSE 8081 19000 19001

# Health check to verify the Expo server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD npm run web || exit 1

# Run Expo development server in web mode (can be overridden for android/ios)
CMD ["npm", "run", "web"]
