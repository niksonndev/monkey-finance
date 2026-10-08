import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  copyFileSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Base do app. GitHub Pages serve repositório de usuário em subpasta
 * (https://<user>.github.io/<repo>/), então tudo — manifest, service worker,
 * precache — precisa ser relativo a este caminho. Ao mover para um domínio
 * próprio na raiz, basta trocar para '/'.
 */
const BASE = '/monkey-finance/';

/** Extensões que entram no precache do service worker. */
const PRECACHE_PATTERN = /\.(?:js|css|html|svg|png|ico|webmanifest|woff2?)$/;

/**
 * Arquivos que nunca entram no precache: o próprio service worker e o
 * manifesto (senão o SW trava atualizações), e o 404.html (cópia do index.html
 * que existe só para deep link no Pages).
 */
const PRECACHE_IGNORE = new Set(['sw.js', 'precache-manifest.json', '404.html']);

function listFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/** Caminho relativo à raiz do build (o mesmo que a raiz da base). */
const toAssetPath = (file) => relative('dist', file).split(sep).join('/');

/**
 * Gera dist/precache-manifest.json com os assets do build e uma versão
 * derivada do conteúdo deles, e publica dist/404.html (cópia do index.html)
 * para deep link funcionar no GitHub Pages, que não tem rewrite de SPA.
 *
 * O public/sw.js lê o manifesto no install para montar o cache offline — evita
 * a dependência de workbox/vite-plugin-pwa, que exigiria reinstalar o
 * node_modules (store do pnpm fora de sincronia).
 */
function pwaBuild() {
  return {
    name: 'monkey-finance:pwa-build',
    apply: 'build',
    closeBundle() {
      copyFileSync(join('dist', 'index.html'), join('dist', '404.html'));

      const files = listFiles('dist')
        .filter((file) => {
          const asset = toAssetPath(file);
          return !PRECACHE_IGNORE.has(asset) && PRECACHE_PATTERN.test(asset);
        })
        .sort();

      const hash = createHash('sha256');
      for (const file of files) {
        hash.update(toAssetPath(file));
        hash.update(readFileSync(file));
      }

      const manifest = {
        base: BASE,
        version: hash.digest('hex').slice(0, 12),
        generatedAt: new Date().toISOString(),
        // Caminhos relativos à base: o service worker resolve cada um contra o
        // próprio scope, então funciona tanto na raiz quanto em subpasta.
        assets: files.map(toAssetPath),
      };

      writeFileSync(
        join('dist', 'precache-manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );

      // O navegador só re-executa o install do service worker quando o arquivo
      // do SW muda. Como o precache é lido do manifesto em tempo de install,
      // marcar a versão aqui garante que um build novo (assets novos) force a
      // atualização do SW — sem isso o cache offline ficava preso na versão
      // antiga.
      const swPath = join('dist', 'sw.js');
      const sw = readFileSync(swPath, 'utf8');
      if (!sw.includes('precache-version:')) {
        appendFileSync(
          swPath,
          `\n/* precache-version: ${manifest.version} */\n`,
        );
      }

      console.log(
        `\n  PWA  base ${BASE} | precache: ${manifest.assets.length} arquivos ` +
          `(versão ${manifest.version}) | 404.html gerado\n`,
      );
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [react(), pwaBuild()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
