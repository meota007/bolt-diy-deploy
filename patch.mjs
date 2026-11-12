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
src = src.replace(/^import\s*\{\s*cloudflare\s*\}\s*from\s*'@cloudflare\/vite-plugin';?\s*\n/m, '');
src = src.replace(/\n\s*config\.mode\s*!==\s*'test'\s*&&\s*cloudflare\(\{[^}]*\}\),?/m, '');
src = src.replace(/\n\s*cloudflare\(\{[^}]*\}\),?/m, '');

if (src === before) {
  console.error('PATCH_FAILED: nenhuma ocorrencia do plugin cloudflare encontrada em vite.config.ts');
  process.exit(1);
}
if (src.includes('cloudflare(')) {
  console.error('PATCH_FAILED: ainda existe chamada cloudflare() em vite.config.ts');
  process.exit(1);
}

fs.writeFileSync(file, src);
console.log('PATCH_OK: plugin cloudflare removido (SSR em Node)');
