# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root configuration and version info
COPY package.json version.json ./
COPY scripts/ scripts/
COPY shared/ shared/

# Build client
COPY client/package.json client/
RUN cd client && npm install

COPY client/ client/
RUN cd client && npm run build

# Build server
COPY server/package.json server/
RUN cd server && npm install

COPY server/ server/
RUN cd server && npm run build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3001

# Copy built server & client artifacts
COPY --from=builder /app/version.json ./
COPY --from=builder /app/server/package.json server/
COPY --from=builder /app/server/dist server/dist
COPY --from=builder /app/client/dist client/dist

# Install production dependencies for server
RUN cd server && npm install --omit=dev

VOLUME ["/data"]
EXPOSE 3001

CMD ["node", "server/dist/server/src/index.js"]
