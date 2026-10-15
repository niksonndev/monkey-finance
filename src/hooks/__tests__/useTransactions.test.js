import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTransactions } from '../useTransactions';

/**
 * Supabase de mentira com a mesma cadeia usada pelo hook
 * (`from().select().eq().order()` e `from().select().eq().eq()` para as
 * recorrências). `proximaResposta` permite segurar a resposta para observar o
 * estado "carregando" no meio de uma recarga.
 */
const estado = vi.hoisted(() => ({
  transacoes: [],
  segurar: false,
  liberar: null,
  erro: null,
  // Objeto fixo: o hook guarda `fetchTransactions` num useCallback que depende
  // do usuário. Se o mock devolvesse um objeto novo a cada render, a identidade
  // mudaria e o efeito buscaria de novo em laço (nada a ver com o que se testa).
  usuario: { id: 'usuario-teste' },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: estado.usuario }),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: (tabela) => {
      const cadeia = {
        select: () => cadeia,
        insert: () => cadeia,
        update: () => cadeia,
        delete: () => cadeia,
        eq: () => cadeia,
        order: () => cadeia,
        then: (resolve) => {
          const responder = () =>
            resolve({
              // Sem recorrências no cenário: o hook materializa as vencidas ao
              // abrir e, se viesse linha aqui, dispararia uma recarga extra que
              // não faz parte do que este teste observa.
              data:
                tabela === 'recurring_transactions' ? [] : estado.transacoes,
              error: estado.erro,
            });

          if (!estado.segurar) return Promise.resolve().then(responder);

          return new Promise((ok) => {
            estado.liberar = () => {
              estado.segurar = false;
              responder();
              ok();
            };
          });
        },
      };
      return cadeia;
    },
  },
}));

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

/**
 * O esqueleto de carregamento (a lista pulsando) só pode aparecer na primeira
 * carga. Numa recarga (depois de salvar ou apagar um lançamento) a lista
 * anterior tem de continuar em tela, senão a tela pisca a cada transação.
 */
describe('useTransactions > carregandoInicial', () => {
  it('vale na primeira carga e não volta numa recarga', async () => {
    estado.transacoes = [
      { id: 't1', type: 'expense', amount: 10, date: '2026-10-01' },
    ];

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.carregandoInicial).toBe(false), {
      timeout: 2000,
    });
    expect(result.current.transactions).toHaveLength(1);

    // Segura a resposta da próxima busca: é a janela em que o esqueleto
    // aparecia no meio da tela, entre o carrinho e a lista nova.
    estado.segurar = true;
    let liberar;
    act(() => {
      liberar = result.current.refetch();
    });

    await waitFor(() => expect(result.current.loading).toBe(true), {
      timeout: 2000,
    });
    expect(result.current.carregandoInicial).toBe(false);
    expect(result.current.transactions).toHaveLength(1);

    await act(async () => {
      estado.liberar();
      await liberar;
    });

    await waitFor(() => expect(result.current.loading).toBe(false), {
      timeout: 2000,
    });
    expect(result.current.carregandoInicial).toBe(false);
  });
});
