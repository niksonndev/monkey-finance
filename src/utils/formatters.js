/**
 * Formata um valor na moeda informada (padrão BRL, mantido por compatibilidade).
 * A moeda ativa do app vem de useCurrency() — ver CurrencyContext.
 */
export function formatCurrency(value, currency = 'BRL') {
  const numero =
    value === null || value === undefined || value === '' ? 0 : Number(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(Number.isFinite(numero) ? numero : 0);
}

export function formatDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseLocalDate(date));
}

/**
 * Converte datas para Date no fuso local.
 * Strings no formato 'yyyy-mm-dd' (padrão de inputs type="date" e de colunas
 * date do Postgres) são interpretadas por new Date() como UTC meia-noite,
 * o que desloca a data um dia para trás em fusos negativos (ex.: Brasil).
 */
export function parseLocalDate(date) {
  if (!date) return null;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(date);
}
