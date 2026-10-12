# Monkey Finance

App de finanças pessoais (PWA) para lançar receitas e despesas, ver o mês por
categoria e acompanhar recorrências. Login exclusivamente com Google, dados por
usuário no Supabase, sem backend próprio.

Publicado no GitHub Pages: https://niksonndev.github.io/monkey-finance/

## Stack

- React 18 + Vite 5 (SPA estática, base `/monkey-finance/`)
- Tailwind 3 + framer-motion (interface e animações)
- chart.js (gráfico de rosca por categoria)
- Supabase (auth Google + Postgres com RLS)
- vitest + Testing Library (testes), eslint (lint)
- PWA sem dependência: `public/sw.js` lê o `precache-manifest.json` gerado no
  build por `vite.config.js`

## Como rodar

```bash
pnpm install
cp .env.example .env      # e preencha as duas variáveis
pnpm dev
```

Variáveis (o Vite embute no bundle; não são segredo de servidor):

```
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave anon>
```

Sem elas o app não sobe: `src/lib/supabaseClient.js` falha de propósito com uma
mensagem pedindo o `.env`.

Em alguns ambientes o `pnpm <script>` aborta antes de rodar (ele detecta que o
`node_modules` veio de outro store e tenta reinstalar tudo). Nesses casos os
binários direto dão o mesmo resultado:

```bash
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
node scripts/check-pwa.mjs
```

## Banco (Supabase)

Rode as migrations em `supabase/migrations/` (SQL Editor do painel ou
`supabase db push`):

1. `001_create_delete_account_function.sql`: RPC `delete_account()`, usada pelo
   botão de excluir conta (a API admin exige a service_role key e não pode rodar
   no browser).
2. `002_transactions_schema_rls.sql`: tabelas `transactions` e
   `recurring_transactions`, índices e as políticas de RLS (cada usuário só vê o
   que é dele).

No painel, em Authentication:

- Providers: Google habilitado (sem ele o login devolve uma página JSON crua; o
  app checa antes de mandar o navegador para lá).
- URL Configuration: a Site URL e as Redirect URLs precisam incluir
  `https://niksonndev.github.io/monkey-finance/**` para o OAuth voltar para o
  app.

## Testes, build e deploy

```bash
pnpm lint && pnpm test && pnpm build && node scripts/check-pwa.mjs
```

`node scripts/check-pwa.mjs` valida o build do PWA (manifest, ícones, precache e
a base do deploy), que é onde uma mudança passa batido por lint e testes.

O CI (`.github/workflows/ci.yml`) roda lint, testes, build e a checagem do PWA;
em push na `master` o job `deploy` publica o `dist/` no GitHub Pages. A suíte de
testes roda com `TZ=America/Maceio`, porque as datas do app são do aparelho e o
runner padrão (UTC) não enxergaria erro de fuso.

## Estrutura

```
src/
  pages/          Dashboard, Transações, Configurações, Login
  components/     lista, modal de lançamento, modal de recorrência, filtros,
                  diálogo de confirmação, gráfico, casca do app
  hooks/          useTransactions (dados), useTransactionPage (mês, filtros e
                  modal compartilhados pelas duas telas de lista),
                  useRecurring (regras e geração das vencidas)
  context/        AuthContext (sessão) e CurrencyContext (moeda do app)
  utils/          formatters (datas e moeda), filtros e agrupamento da lista
  constants/      categorias e moedas
public/           sw.js (service worker) e ícones
supabase/         migrations
```

## Decisões que valem saber

- **A moeda é global, não por lançamento.** Trocar a unidade em Configurações não
  converte valores: o app não usa cotação, e o aviso na tela deixa isso explícito.
- **As recorrências são geradas quando o app abre.** Não há cron no servidor: ao
  entrar, as ocorrências vencidas (inclusive de meses em que o usuário não
  entrou) viram lançamentos e o `next_date` da regra avança. A regra pode ser
  editada ou encerrada em Configurações, e os lançamentos já criados não mudam.
- **Datas são tratadas no fuso do aparelho.** Use `parseLocalDate` e `hojeISO`
  (`src/utils/formatters.js`) em vez de `new Date(...)`/`toISOString()`, que
  leem a data em UTC e furam o dia depois das 21h no Brasil.
- **A senha é a do Google.** O app não tem senha própria nem tela de cadastro: a
  conta é criada no primeiro acesso.
- **Notificações ainda não são enviadas.** As preferências em Configurações são
  guardadas no aparelho, por usuário, mas não existe disparo de e-mail nem push.
- **Categorias são fixas** (`src/constants/categories.js`); não há criação de
  categoria própria.
- **Chaves de `localStorage` mantêm o prefixo antigo (`monkeynanca:`)** de
  propósito: renomear apagaria moeda e preferências de quem já usa o app.
