# syntax=docker/dockerfile:1

# ---- Stage 1: build the static files with Node ----
FROM node:22.23.4-alpine AS build

WORKDIR /app

# Dependencies first: this layer is reused until package.json or the lockfile changes.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .

# Vite writes VITE_* values into the JavaScript at build time, so the API address is
# a build argument (docker compose passes it in from an env var).
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Stage 2: serve the built files with nginx ----
# The "unprivileged" image runs nginx as a normal user (uid 101) and listens on 8080,
# because ports below 1024 need root.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
