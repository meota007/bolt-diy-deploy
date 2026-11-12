import fs from 'node:fs';

/*
 * Remove o plugin do Cloudflare do vite.config.ts.
 *
 * Por que: com ele, o SSR do bolt roda dentro do workerd, e o app le
 * "context.cloudflare.env" â que o "vite preview" nao popula com o env do
 * container. Sem o plugin, o SSR roda em Node, "process.env" funciona e todas
 * as variaveis (OPENAI_LIKE_API_BASE_URL, OPENAI_LIKE_API_KEY, ...) chegam ao
 * provedor sem depender do cookie do navegador.
 */
const file = 'vite.config.ts';
let src = fs.readFileSync(file, 'utf8');
const before = src;

// 1) import { cloudflare } from '@cloudflare/vite-plugin';
src = src.replace(/^[ \t]*import\s*\{[^}]*\bcloudflare\b[^}]*\}\s*from\s*['"]@cloudflare\/vite-plugin['"];?[ \t]*\r?\n/m, '');

// 2) a entrada do plugin na lista (aceita chaves aninhadas)
src = src.replace(/[ \t]*config\.mode\s*!==\s*['"]test['"]\s*&&\s*cloudflare\([\s\S]*?\)\s*,?[ \t]*\r?\n/, '');
src = src.replace(/[ \t]*cloudflare\(\{[^\n]*?\}\)\s*,?[ \t]*\r?\n/, '');

if (src === before) {
  console.error('PATCH_FAILED: nenhuma ocorrencia do plugin cloudflare encontrada em vite.config.ts');
  process.exit(1);
}
if (/cloudflare\(/.test(src)) {
  console.error('PATCH_FAILED: ainda existe chamada cloudflare() em vite.config.ts');
  process.exit(1);
}

fs.writeFileSync(file, src);
console.log('PATCH_OK: plugin cloudflare removido (SSR em Node)');

/*
 * Diagnostico temporario: o app loga apenas o NOME do erro de streaming.
 * Aqui adicionamos mensagem + stack para conseguir achar a causa.
 * Remova este bloco quando o bug estiver resolvido (o texto pode conter dados
 * sensiveis da request).
 */
const errFile = 'app/lib/.server/api/errors.ts';
let errSrc = fs.readFileSync(errFile, 'utf8');
const marker = "logger.error(`Streaming provider error (${error instanceof Error ? error.name : 'UnknownError'})`);";
if (!errSrc.includes(marker)) {
  console.error('PATCH_FAILED: linha de log do erro de streaming nao encontrada');
  process.exit(1);
}
errSrc = errSrc.replace(
  marker,
  "logger.error(`Streaming provider error (${error instanceof Error ? error.name : 'UnknownError'}) | msg=${providerMessage} | stack=${error instanceof Error ? String(error.stack || '').split('\\n').slice(0, 6).join(' <- ') : ''}`);",
);
fs.writeFileSync(errFile, errSrc);
console.log('PATCH_OK: log de erro com mensagem + stack');
