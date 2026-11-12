# bolt-diy-deploy

Imagem de deploy do [bolt.diy](https://github.com/stackblitz-labs/bolt.diy) para EasyPanel,
com duas correcoes em relacao ao Dockerfile oficial:

1. **Nao roda `pnpm prune --prod`** — o `dockerstart` oficial chama `vite preview`, e `vite`
   e devDependency; a imagem publicada sobe e morre com `sh: 1: vite: not found`
   (issue [#2293](https://github.com/stackblitz-labs/bolt.diy/issues/2293)).
2. **Remove o plugin `@cloudflare/vite-plugin`** (`patch.mjs`) — com ele o SSR roda no
   `workerd` e o app le `context.cloudflare.env`, que o `vite preview` nao popula com o env do
   container. Sem o plugin o SSR roda em Node e `process.env` funciona.

## Build

```bash
docker build -t bolt-diy .
# fixar uma versao do upstream:
docker build --build-arg UPSTREAM_REF=<commit-ou-tag> -t bolt-diy .
```

## Run

```bash
docker run -p 5173:5173 \
  -e OPENAI_LIKE_API_BASE_URL=https://SEU-PROXY/v1 \
  -e OPENAI_LIKE_API_KEY=sua-chave \
  bolt-diy
```

O `main` do upstream e clonado **no build**: nao existe fork para sincronizar — para atualizar,
basta redeployar (ou fixar `UPSTREAM_REF` para build reproduzivel).
