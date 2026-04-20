FROM node:22.12-slim AS base

WORKDIR /app

COPY package.json package-lock.json* ./

FROM base AS deps

RUN npm config set fund false

COPY package.json package-lock.json* ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ── Dev target (used by docker-compose.yml for local development) ────────────
FROM deps AS dev

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Build target ─────────────────────────────────────────────────────────────
FROM deps AS build

ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY . .

RUN npm run build

# ── Production target: static files served by nginx ──────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx site
RUN rm /etc/nginx/conf.d/default.conf

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:80/ || exit 1
