# syntax=docker/dockerfile:1
# All-in-one image: Next.js (standalone) + FastAPI behind nginx on $PORT.
# Use when deploying the Git repo root on Railway with no service "Root directory".

FROM node:22-bookworm-slim AS webbuilder
WORKDIR /src/frontend
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
ARG NEXT_PUBLIC_SITE_URL=https://example.invalid
ARG NEXT_PUBLIC_API_URL=same
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    API_INTERNAL_URL=http://127.0.0.1:8000
RUN pnpm run build

FROM python:3.12-slim-bookworm AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx curl xz-utils ca-certificates \
  && NODE_VERSION=22.14.0 \
  && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend /app/backend
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir /app/backend

COPY --from=webbuilder /src/frontend/.next/standalone /app/web
COPY --from=webbuilder /src/frontend/.next/static /app/web/.next/static
COPY --from=webbuilder /src/frontend/public /app/web/public

COPY deploy/railway/entrypoint.sh /entrypoint.sh
COPY deploy/railway/nginx.conf.template /etc/nginx/nginx.conf.template
RUN chmod +x /entrypoint.sh

ENV API_INTERNAL_URL=http://127.0.0.1:8000
EXPOSE 8080
CMD ["/entrypoint.sh"]
