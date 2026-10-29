FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
# File konfigurasi non-TS tidak ikut tsc build; wajib di-copy manual ke image final.
# Loader membacanya dari process.cwd()/config/, dipakai semua provider (mock/openai/gemini).
COPY --from=builder /app/config ./config

EXPOSE 3001

CMD ["node", "dist/server.js"]