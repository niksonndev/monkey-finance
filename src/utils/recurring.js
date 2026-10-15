import { addMonths, addWeeks, format } from 'date-fns';
import { parseLocalDate } from './formatters';

/**
 * Trava de segurança: um next_date absurdo (ex.: 1900) geraria milhares de
 * lançamentos. Passando disso, paramos e deixamos a próxima execução seguir.
 */
const MAX_OCORRENCIAS = 600;

/** Data no formato que o Postgres usa na coluna `date`. */
export const paraDataISO = (data) => format(data, 'yyyy-MM-dd');

/**
 * Ocorrências vencidas de uma recorrência: as datas de `next_date` até hoje
 * (inclusive) e a primeira data futura, que vira o novo `next_date`.
 *
 * O avanço parte sempre da data âncora original — `addMonths(ancora, k)` — em
 * vez de somar mês a mês sobre o resultado: assim o dia não "derrapa"
 * (31/01 → 28/02 → 31/03, e não → 28/03).
 */
export function ocorrenciasVencidas(
  { next_date, frequency },
  hoje = new Date(),
) {
  const ancora = parseLocalDate(next_date);
  if (!ancora || Number.isNaN(ancora.getTime())) {
    return { vencidas: [], proxima: null };
  }

  const hojeISO = paraDataISO(hoje);
  const ocorrencia = (k) =>
    frequency === 'weekly' ? addWeeks(ancora, k) : addMonths(ancora, k);

  const vencidas = [];
  let proxima = null;

  for (let k = 0; k < MAX_OCORRENCIAS; k += 1) {
    const iso = paraDataISO(ocorrencia(k));
    // Comparação por string funciona porque ISO (yyyy-mm-dd) ordena igual à
    // data, e evita armadilha de fuso ao comparar Date.
    if (iso <= hojeISO) {
      vencidas.push(iso);
      continue;
    }
    proxima = iso;
    break;
  }

  return { vencidas, proxima };
}
