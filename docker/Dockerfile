# AICOS web. Build from the Frontend folder:
#   docker build -f docker/Dockerfile --build-arg VITE_USE_MOCK=false -t aicos/web .
#
# VITE_* values are baked in at build time (they are public). Never pass a server secret as a build-arg.

FROM node:26-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8080/api/v1
ARG VITE_USE_MOCK=false
ARG VITE_AI_BASE_URL=http://localhost:8090/api/v1/ai
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_AI_BASE_URL=$VITE_AI_BASE_URL
RUN pnpm exec tsc --noEmit && pnpm exec vite build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
LABEL org.opencontainers.image.title="aicos-web" \
      org.opencontainers.image.source="https://github.com/KushinoAkira/AICOS-FE"
