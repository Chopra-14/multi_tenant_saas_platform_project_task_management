# Dockerfile for Backend (Node.js Express)

# ---------- Build Stage ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# ---------- Runtime Stage ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
RUN apk add --no-cache postgresql-client curl
# Expose port
EXPOSE 5000
# Entrypoint will run migrations, seeds, then start server
CMD ["sh", "./docker-entrypoint.sh"]
