/*
 * Proxy do OpenCode Go para o bolt.diy.
 *
 * Por que existe: a rota Go do OpenCode exige o header `x-opencode-session`
 * (qualquer id serve) + identificacao de cliente em TODA chamada de chat, e o
 * provedor "OpenAI-Like" do bolt nao envia headers customizados.
 *
 * Rotas:
 *   GET  /v1/models            -> repassa para <upstream>/models
 *   POST /v1/chat/completions  -> repassa para <upstream>/chat/completions
 *   GET  /v1/_hits             -> diagnostico (contador + ultimos erros)
 */
const http = require('node:http');

const UP = process.env.UPSTREAM || 'https://opencode.ai/zen/go/v1';
const PORT = Number(process.env.PORT || 8080);
const SESSION = 'bolt-' + Date.now().toString(36);

const ALLOWED = [/^\/v1\/models$/, /^\/v1\/chat\/completions$/];
const stats = { hits: [], errors: [] };

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  const path = (req.url || '/').split('?')[0];

  if (path === '/v1/_hits') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ hits: stats.hits.length, errors: stats.errors.slice(-3) }));
  }

  if (!ALLOWED.some((re) => re.test(path))) {
    res.writeHead(404, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not_found' }));
  }

  const auth = req.headers.authorization;

  if (!auth) {
    res.writeHead(401, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'missing_authorization' }));
  }

  stats.hits.push({ t: Date.now(), path });
  if (stats.hits.length > 100) stats.hits.shift();

  try {
    const headers = {
      authorization: auth,
      'content-type': req.headers['content-type'] || 'application/json',
      accept: req.headers.accept || 'application/json',
      'user-agent': 'bolt-diy-opencode-go/1.0',
      'x-opencode-client': 'bolt-diy',
      'x-opencode-session': SESSION,
    };

    let body;

    if (!(req.method === 'GET' || req.method === 'HEAD')) {
      body = await readBody(req);
      headers['content-length'] = String(body.length);
    }

    const upstream = await fetch(UP + path.replace(/^\/v1/, ''), { method: req.method, headers, body });

    if (upstream.status >= 400) {
      const t = await upstream.text();
      stats.errors.push({ s: upstream.status, t: t.slice(0, 250) });
      res.writeHead(upstream.status, { 'content-type': 'application/json' });
      return res.end(t);
    }

    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no',
    });

    if (upstream.body) {
      for await (const chunk of upstream.body) {
        res.write(chunk);
      }
    }

    res.end();
  } catch (err) {
    stats.errors.push({ exception: String((err && err.message) || err) });
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'proxy_failed', detail: String((err && err.message) || err) }));
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`opencode-go proxy on ${PORT} -> ${UP}`));
