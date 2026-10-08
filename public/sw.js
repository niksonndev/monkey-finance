/* eslint-env serviceworker */
/**
 * Service worker do Monkey Finance.
 *
 * Estratégia (sem workbox, para não adicionar dependências):
 * - install: lê /precache-manifest.json (gerado no build por vite.config.js) e
 *   guarda o app shell num cache versionado pelo hash do conteúdo.
 * - activate: descarta caches de versões antigas e assume o controle.
 * - navegação: network-first (pega a versão nova quando há rede) com fallback
 *   para o index.html em cache; resposta de erro do host (404 em rota interna
 *   sem rewrite) também cai no shell, então deep links funcionam em qualquer
 *   host estático.
 * - assets: stale-while-revalidate (responde do cache e revalida em background).
 * - requisições de outra origem (API do Supabase) passam direto para a rede:
 *   dados financeiros nunca são cacheados no service worker.
 */

const CACHE_PREFIX = 'monkey-finance';
const MANIFEST_URL = 'precache-manifest.json';
const FALLBACK_URL = 'index.html';

/**
 * Nome do cache da versão em uso. Não pode viver só em memória: o navegador
 * encerra o SW ocioso e recria o escopo na próxima execução — se o nome fosse
 * perdido, os assets do precache ficariam invisíveis para o fetch handler e o
 * app não abriria offline.
 */
let currentCacheName = null;

const scopeUrl = (path) => new URL(path, self.registration.scope).href;

async function activeCache() {
  if (!currentCacheName) {
    const names = (await caches.keys()).filter((name) =>
      name.startsWith(`${CACHE_PREFIX}-`),
    );
    // Depois do activate sobra só o cache da versão atual; se houver mais de
    // um, o último na ordenação é o mais recente.
    currentCacheName = names.sort().pop() || `${CACHE_PREFIX}-runtime`;
  }
  return caches.open(currentCacheName);
}

async function precache() {
  const response = await fetch(scopeUrl(MANIFEST_URL), { cache: 'no-store' });
  if (!response.ok)
    throw new Error(`Manifesto indisponível (${response.status})`);

  const { version, assets } = await response.json();
  const cacheName = `${CACHE_PREFIX}-${version}`;
  const cache = await caches.open(cacheName);

  // addAll falha inteiro se um único arquivo falhar; aqui cada asset é
  // opcional, para o app não ficar sem SW por causa de um 404. Os caminhos do
  // manifesto são relativos à base, então resolvem contra o scope do SW tanto
  // na raiz quanto em subpasta (GitHub Pages).
  await Promise.all(
    assets.map(async (asset) => {
      try {
        await cache.add(new Request(scopeUrl(asset), { cache: 'reload' }));
      } catch (error) {
        console.warn('[sw] não foi possível pré-cachear', asset, error);
      }
    }),
  );

  currentCacheName = cacheName;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await precache();
      } catch (error) {
        // Instala mesmo sem precache: o fetch handler ainda serve a rede e o
        // precache é tentado de novo na próxima atualização.
        console.warn('[sw] precache falhou:', error);
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith(`${CACHE_PREFIX}-`) && name !== currentCacheName,
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// Permite que a página peça a ativação imediata de uma versão nova.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const OFFLINE_PAGE =
  '<!doctype html><html lang="pt-BR"><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<body style="margin:0;background:#1a1a2e;color:#e8e8e8;font-family:system-ui;' +
  'display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">' +
  '<div><h1 style="font-size:1.25rem">Você está offline</h1>' +
  '<p style="color:#6b6b8a">Conecte-se à internet para carregar o Monkey Finance.</p>' +
  '</div></body></html>';

async function networkFirstNavigation(request) {
  const cache = await activeCache();

  try {
    const response = await fetch(request);

    // Resposta de erro do host (ex.: 404 em /settings sem rewrite de SPA):
    // serve o app shell em vez da página de erro.
    if (!response.ok) {
      const shell = await caches.match(scopeUrl(FALLBACK_URL), {
        ignoreVary: true,
      });
      if (shell) return shell;
    }

    cache.put(scopeUrl(FALLBACK_URL), response.clone());
    return response;
  } catch (error) {
    const cached =
      (await caches.match(scopeUrl(FALLBACK_URL), { ignoreVary: true })) ||
      (await caches.match(request, { ignoreVary: true }));
    if (cached) return cached;

    return new Response(OFFLINE_PAGE, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await activeCache();

  // ignoreVary é obrigatório aqui: o host responde "Vary: Origin" e o Chrome
  // envia Origin nos assets carregados com crossorigin (script/stylesheet do
  // build). Comparando o Vary, o match erra o alvo e o app fica sem JS/CSS
  // offline — foi exatamente o que acontecia antes desta correção.
  const cached = await cache.match(request, { ignoreVary: true });

  const network = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const response = await network;
  return (
    response ||
    new Response('', { status: 504, statusText: 'Offline e sem cópia em cache' })
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase/API: sempre rede
  if (url.pathname.endsWith(MANIFEST_URL)) return; // manifesto: sempre rede
  if (url.pathname.endsWith('/sw.js')) return; // script do SW: sempre rede

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
