# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx node-pg-migrate

# Copy build output dan config JSON (tsc tidak copy JSON ke dist/)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

# Copy migration files (untuk backend-init service)
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/seed ./seed
COPY --from=builder /app/src ./src

CMD ["node", "dist/server.js"]
