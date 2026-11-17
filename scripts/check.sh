#!/usr/bin/env bash
# Verificacao do deploy do Bolt + diagnostico do proxy. Somente leitura.
# Uso: ./scripts/check.sh [APP_URL] [PROXY_URL]
#   Com Basic Auth no dominio: BOLT_BASIC="usuario:senha" ./scripts/check.sh
set -u

APP="${1:-https://3-tst-bolt-diy.b3mcko.easypanel.host}"
PROXY="${2:-https://3-tst-opencode-go.b3mcko.easypanel.host}"

AUTH=()
if [ -n "${BOLT_BASIC:-}" ]; then AUTH=(-u "$BOLT_BASIC"); fi

code() { curl "${AUTH[@]}" -s -o /dev/null -w '%{http_code}' --max-time 25 "$1"; }

appCode=$(code "$APP/")
echo "app        : $appCode"
if [ "$appCode" = "401" ]; then
  echo "             (401 = Basic Auth do Traefik; use BOLT_BASIC=\"usuario:senha\")"
fi

versao=$(curl "${AUTH[@]}" -s --max-time 20 "$APP/deploy-version.txt" | cut -c1-12)
echo "versao     : ${versao:-(indisponivel)}  (commit do upstream)"

json=$(curl "${AUTH[@]}" -s --max-time 25 "$APP/api/models/OpenAILike" || true)
count=$(printf '%s' "$json" | grep -o '"name"' | wc -l | tr -d ' ')
echo "modelos    : ${count:-0}"
if [ "${count:-0}" -gt 0 ]; then
  printf '%s' "$json" | grep -o '"name":"[^"]*"' | head -5 | sed 's/"name":"/  - /; s/"$//'
fi

hits=$(curl -s --max-time 20 "$PROXY/v1/_hits" || echo '')
echo "proxy      : ${hits:-(sem resposta)}"

case "$hits" in
  *'"errors":[]'*) echo "diagnostico: OK (nenhum erro do upstream)";;
  *MissingSessionID*) echo "diagnostico: proxy antigo (sem x-opencode-session) - redeployar opencode-go";;
  *tool_choice*) echo "diagnostico: proxy antigo (sem normalizeToolChoice) - redeployar opencode-go";;
  *401*) echo "diagnostico: 401 - se o chat funciona, e residuo de teste; se nao, OPENAI_LIKE_API_KEY invalida";;
  *502*) echo "diagnostico: 502 - proxy nao alcancou o upstream (DNS/TLS/rede)";;
  *) echo "diagnostico: ver tabela em docs/runbook.md (Lendo o /v1/_hits)";;
esac

echo
echo "Esperado: app 200, versao preenchida, modelos > 0, proxy sem erros."
