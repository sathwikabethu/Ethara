# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for all workspaces
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/

# Install root dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN cd backend && npx prisma generate

# Build Shared
RUN cd shared && npm run build

# Build Backend
RUN cd backend && npm run build

# Build Frontend
RUN cd frontend && npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 3001

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Command to run migrations and start the server
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node dist/server.js"]
