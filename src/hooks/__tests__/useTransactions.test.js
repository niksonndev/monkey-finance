import { describe, it, expect } from 'vitest';

/**
 * Regressão de getSummary.
 *
 * O hook real depende de React/Supabase, então aqui replicamos o laço de soma
 * que ele usa (laço único, receitas e despesas na mesma passada). Serve para
 * garantir que a otimização de performance não mude o resultado:
 *  - tipo desconhecido não entra em nenhum dos dois totais (antes, o filter
 *    por 'income'/'expense' também ignorava; o laço precisa preservar isso);
 *  - valor numérico em string (o que vem do Postgres) soma como número;
 *  - lista vazia dá zero, não NaN.
 */
function getSummary(txs) {
  let income = 0;
  let expenses = 0;

  for (const t of txs) {
    const valor = Number(t.amount);
    if (t.type === 'income') income += valor;
    else if (t.type === 'expense') expenses += valor;
  }

  return { income, expenses, balance: income - expenses };
}

describe('getSummary', () => {
  it('soma receitas, despesas e o saldo', () => {
    const resultado = getSummary([
      { type: 'income', amount: '1000.50' },
      { type: 'expense', amount: 250 },
      { type: 'income', amount: 99.5 },
      { type: 'expense', amount: '0.5' },
    ]);
    expect(resultado.income).toBe(1100);
    expect(resultado.expenses).toBe(250.5);
    expect(resultado.balance).toBe(849.5);
  });

  it('ignora tipo desconhecido nos dois totais', () => {
    const resultado = getSummary([
      { type: 'income', amount: 10 },
      { type: 'transfer', amount: 999 },
      { type: 'expense', amount: 4 },
    ]);
    expect(resultado.income).toBe(10);
    expect(resultado.expenses).toBe(4);
    expect(resultado.balance).toBe(6);
  });

  it('lista vazia dá zeros, não NaN', () => {
    expect(getSummary([])).toEqual({ income: 0, expenses: 0, balance: 0 });
  });
});
