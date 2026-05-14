FROM node:24-slim

WORKDIR /app

# Install build tools for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3 /usr/bin/python

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
