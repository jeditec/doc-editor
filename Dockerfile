FROM node:20-alpine

WORKDIR /app

# Install system deps needed for better-sqlite3 native build
RUN apk add --no-cache make g++ python3

# Install pnpm via corepack (stable v8)
RUN corepack enable pnpm && corepack prepare pnpm@8.15.0 --activate

COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

COPY . .

# Expose port
EXPOSE 8040

# Set environment
ENV PORT=8040

CMD ["node", "server.js"]
