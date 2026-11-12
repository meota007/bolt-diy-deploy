# Imagem do bolt.diy com SSR em Node (sem workerd) para EasyPanel.
#
# Diferencas em relacao ao Dockerfile oficial:
#   1. NUNCA roda "pnpm prune --prod": o script oficial depende do vite, que e
#      devDependency, e a imagem publicada morre com "vite: not found".
#   2. Remove o plugin do Cloudflare (patch.mjs), para o SSR rodar em Node e o
#      process.env do container chegar ao provedor.
#   3. Start via @react-router/serve (Node), em vez de "vite preview".
FROM node:22-bookworm-slim

ARG UPSTREAM_REPO=https://github.com/stackblitz-labs/bolt.diy.git
ARG UPSTREAM_REF=main

ENV HUSKY=0 \
    CI=true

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

RUN git clone --depth 1 --branch "${UPSTREAM_REF}" "${UPSTREAM_REPO}" . \
 && git rev-parse HEAD > /app/upstream-commit.txt \
 && echo "upstream: $(cat /app/upstream-commit.txt) (${UPSTREAM_REF})"

COPY patch.mjs /app/patch.mjs
RUN node /app/patch.mjs

RUN pnpm install --frozen-lockfile --prod=false
RUN NODE_OPTIONS=--max-old-space-size=4096 pnpm run build
RUN pnpm add --save @react-router/serve@^8.4.0

# Marcador de versao: GET /deploy-version.txt mostra o commit do upstream que esta no ar.
RUN cp /app/upstream-commit.txt build/client/deploy-version.txt

ENV NODE_ENV=production \
    PORT=5173 \
    HOST=0.0.0.0 \
    RUNNING_IN_DOCKER=true

EXPOSE 5173

CMD ["sh", "-c", "exec node_modules/.bin/react-router-serve ./build/server/index.js"]
