/**
 * Valida o build PWA (roda no CI depois do `pnpm build`).
 *
 * Existe porque uma mudança que quebra o manifest, um ícone, o precache ou a
 * base do deploy (subpasta do GitHub Pages) passa desapercebida em
 * lint/testes — e o problema só aparece na hora de instalar o app no celular.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const problems = [];

function readJson(file) {
  const path = join(DIST, file);
  if (!existsSync(path)) {
    problems.push(`faltando no build: ${file}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    problems.push(`${file}: JSON inválido (${error.message})`);
    return null;
  }
}

const readText = (file) =>
  existsSync(join(DIST, file)) ? readFileSync(join(DIST, file), 'utf8') : '';

// O precache carrega a base do build (ex.: /monkey-finance/ no GitHub Pages) —
// é o que permite converter link absoluto do HTML em caminho dentro de dist.
const precache = readJson('precache-manifest.json');
const base = precache?.base ?? '/';

/** Caminho dentro de dist para um link do HTML/manifest. */
const paraDist = (url) => {
  const texto = String(url);
  const semBase = texto.startsWith(base) ? texto.slice(base.length) : texto;
  return join(DIST, semBase.replace(/^\//, ''));
};

// 1. Arquivos obrigatórios
for (const file of [
  'index.html',
  '404.html',
  'sw.js',
  'manifest.webmanifest',
  'precache-manifest.json',
  'icons/favicon-32.png',
  'icons/favicon-16.png',
]) {
  if (!existsSync(join(DIST, file))) problems.push(`faltando no build: ${file}`);
}

// 2. index.html: o 404.html precisa ser cópia fiel dele (deep link no Pages)
const html = readText('index.html');
if (html.includes('%BASE%')) {
  problems.push('index.html com %BASE% não substituído (links do PWA quebram)');
}
if (html && readText('404.html') !== html) {
  problems.push('404.html difere do index.html (deep link no Pages quebra)');
}

// 3. index.html precisa apontar para o manifest e para o iOS
for (const marker of [
  'rel="manifest"',
  'apple-touch-icon',
  'theme-color',
  'apple-mobile-web-app-capable',
]) {
  if (!html.includes(marker)) problems.push(`index.html sem ${marker}`);
}

// 4. O manifest referenciado no HTML precisa existir e respeitar a base
const manifestHref = html.match(/rel="manifest"\s+href="([^"]+)"/)?.[1];
if (manifestHref) {
  if (!manifestHref.startsWith(base)) {
    problems.push(
      `index.html aponta o manifest para "${manifestHref}", fora da base "${base}"`,
    );
  }
  if (!existsSync(paraDist(manifestHref))) {
    problems.push(
      `index.html aponta para manifest inexistente: ${manifestHref}`,
    );
  }
}

// 5. Manifest: campos exigidos para o navegador oferecer a instalação
const manifest = readJson('manifest.webmanifest');
if (manifest) {
  for (const field of ['name', 'short_name', 'start_url', 'display', 'icons']) {
    if (!manifest[field]) problems.push(`manifest sem "${field}"`);
  }
  if (manifest.display !== 'standalone') {
    problems.push(
      `manifest.display é "${manifest.display}" (esperado "standalone")`,
    );
  }
  // start_url/scope relativos: é o que faz o app funcionar tanto na raiz
  // quanto na subpasta do GitHub Pages. O id fica de fora de propósito: o
  // Chrome resolve um id relativo contra a origem (virando a raiz do
  // github.io, que colidiria com outro app no mesmo host) — sem ele, o id é o
  // próprio start_url.
  for (const field of ['start_url', 'scope']) {
    const valor = String(manifest[field] ?? '');
    if (valor.startsWith('/')) {
      problems.push(`manifest.${field} absoluto ("${valor}") em vez de relativo`);
    }
  }

  const icons = manifest.icons ?? [];
  for (const size of ['192x192', '512x512']) {
    const found = icons.some((icon) => (icon.sizes ?? '').includes(size));
    if (!found) problems.push(`manifest sem ícone ${size} (obrigatório)`);
  }
  if (!icons.some((icon) => (icon.purpose ?? '').includes('maskable'))) {
    problems.push('manifest sem ícone maskable (Android corta o ícone)');
  }
  for (const icon of icons) {
    if (!existsSync(paraDist(icon.src))) {
      problems.push(`ícone listado e ausente: ${icon.src}`);
    }
  }
}

// 6. Precache: precisa cobrir o app shell e só listar o que existe
if (precache) {
  const assets = precache.assets ?? [];
  if (!precache.version) problems.push('precache sem version');
  if (!precache.base) problems.push('precache sem base');
  if (assets.length === 0) problems.push('precache sem assets');
  for (const asset of assets) {
    if (asset.startsWith('/')) {
      problems.push(
        `asset absoluto no precache ("${asset}") — não resolve em subpasta`,
      );
    }
    if (!existsSync(join(DIST, asset))) {
      problems.push(`asset listado e ausente: ${asset}`);
    }
  }
  if (!assets.includes('index.html')) {
    problems.push('precache sem index.html (fallback offline quebra)');
  }
  for (const proibido of ['sw.js', '404.html']) {
    if (assets.includes(proibido)) {
      problems.push(`${proibido} não pode estar no precache`);
    }
  }

  // O sw.js precisa carregar a marca da versão: é o que faz o navegador
  // reinstalar o SW (e repopular o precache) quando os assets mudam.
  const sw = readText('sw.js');
  if (!sw.includes(`precache-version: ${precache.version}`)) {
    problems.push(
      'sw.js sem a marca da versão do precache (atualização offline trava)',
    );
  }
}

if (problems.length > 0) {
  console.error('Build PWA inválido:');
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}

console.log(
  `Build PWA ok: base ${precache.base}, ${precache.assets.length} assets ` +
    `pré-cacheados, ${manifest.icons.length} ícones, versão ${precache.version}.`,
);
