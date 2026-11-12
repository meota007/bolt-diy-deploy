# Imagem do proxy do OpenCode Go (sem dependencias, Node puro).
FROM node:22-alpine
WORKDIR /app
COPY proxy.js /app/proxy.js
ENV PORT=8080 \
    UPSTREAM=https://opencode.ai/zen/go/v1
EXPOSE 8080
CMD ["node", "/app/proxy.js"]
