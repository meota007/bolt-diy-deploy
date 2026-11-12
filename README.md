# bolt-diy-deploy

Deploy do [bolt.diy](https://github.com/stackblitz-labs/bolt.diy) com **OpenCode Go** (não zen).

## Por que este repo existe

Três correções em relação ao Dockerfile oficial, todas necessárias para o chat funcionar:

1. **Não roda `pnpm prune --prod`** — o `dockerstart` oficial chama `vite preview` e `vite` é
   devDependency; a imagem publicada morre com `sh: 1: vite: not found` (issue
   [#2293](https://github.com/stackblitz-labs/bolt.diy/issues/2293)).
2. **Remove o plugin do Cloudflare** (`patch.mjs`) — com ele o SSR roda no `workerd` e o env do
   container não chega ao provedor.
3. **Preserva `provider`/`modelId` no wrapper de stream** (`patch.mjs`) — o SDK `ai@7` faz
   `resolvedModel.provider.split('.')` e o spread do `wrapLanguageModel` perdia o campo
   (`TypeError ... reading 'split'` em **todos** os provedores).
   Também guarda `dirent.content` em `createFilesContext` (arquivo sem conteúdo derrubava o request).

O upstream é **clonado no build** (`ARG UPSTREAM_REF=main`): não há fork para sincronizar — para
atualizar, redeploye.

## Arquivos

| Arquivo | Papel |
|---|---|
| `Dockerfile` | app: clona upstream, aplica patch, builda, sobe com `react-router-serve` |
| `patch.mjs` | as 3 correções acima |
| `proxy/` | proxy do OpenCode Go (`node:22-alpine`, código próprio) |
| `docker-compose.yml` + `.env.example` | subir tudo fora do EasyPanel |

## Subir (docker compose)

```bash
cp .env.example .env      # preencha OPENCODE_API_KEY
docker compose up -d --build
```

- app: `http://localhost:5173`
- proxy: rede interna `http://proxy:8080/v1`
- falta o TLS: proxy reverso (Traefik/Nginx/Caddy) na frente da 5173

## Subir (EasyPanel)

Dois serviços **App**:

**`opencode-go`** — imagem `node:22-alpine`, command `node /app/proxy.js`, domínio → porta 8080,
mount *file* `/app/proxy.js` = `proxy/proxy.js` (ou build do `proxy/Dockerfile`).

**`bolt-diy`** — git `https://github.com/meota007/bolt-diy-deploy.git` (branch `main`), build
**Dockerfile**, domínio → porta 5173, envs:

```
OPENAI_LIKE_API_BASE_URL=https://<dominio-do-proxy>/v1
OPENAI_LIKE_API_KEY=oc_sk_...
OPENAI_LIKE_API_MODELS=deepseek-v4.1-flash:200000;glm-5.3-flash:200000
RUNNING_IN_DOCKER=true
TZ=America/Sao_Paulo
```

## Verificação

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<app>/
curl -s https://<app>/api/models/OpenAILike | head -c 200   # 30 modelos, sem cookie
curl -s https://<proxy>/v1/_hits                             # hits + errors
```

Chat deve responder com `Tokens: ...` usando o provedor **OpenAI-Like**.

## Nota

Com API key `oc_sk_...` o mesmo credencial serve para Go (assinatura) e zen (pay-per-use). Aqui
usamos **Go** (`/zen/go/v1`), que exige `x-opencode-session` — por isso o proxy.
