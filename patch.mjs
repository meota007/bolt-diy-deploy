import fs from 'node:fs';

/*
 * Remove o plugin do Cloudflare do vite.config.ts.
 *
 * Por que: com ele, o SSR do bolt roda dentro do workerd, e o app le
 * "context.cloudflare.env" — que o "vite preview" nao popula com o env do
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
if (/from\s*['"]@cloudflare\/vite-plugin['"]/.test(src)) {
  console.error('PATCH_FAILED: import do plugin cloudflare ainda presente');
  process.exit(1);
}

fs.writeFileSync(file, src);
console.log('PATCH_OK: plugin cloudflare removido (SSR em Node)');
