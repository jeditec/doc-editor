FROM node:20-alpine AS build

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json package-lock.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

COPY . .

# Expose port
EXPOSE 8040

# Set environment
ENV PORT=8040

CMD ["node", "server.js"]
