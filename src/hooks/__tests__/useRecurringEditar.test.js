import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

/**
 * Edição de uma recorrência (a regra). Fica num arquivo próprio porque aqui o
 * hook é montado de verdade e sem relógio falso: o arquivo vizinho
 * (useRecurring.test.js) congela o tempo para testar a geração das ocorrências,
 * e o Testing Library não combina bem com isso.
 */
const estado = vi.hoisted(() => ({
  dados: [],
  atualizacoes: [],
  erroAtualizacao: null,
  // Objeto fixo: o hook guarda a busca num useCallback que depende do usuário;
  // se o mock devolvesse um objeto novo a cada render, o efeito buscaria em
  // laço e o teste nunca sairia do lugar.
  usuario: { id: 'usuario-teste' },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: estado.usuario }),
}));

vi.mock('../../lib/supabaseClient', () => {
  const cadeia = (erro = null) => ({
    select: () => cadeia(erro),
    eq: () => cadeia(erro),
    order: () => cadeia(erro),
    update: (patch) => {
      estado.atualizacoes.push(patch);
      return cadeia(estado.erroAtualizacao);
    },
    then: (resolve) =>
      Promise.resolve(
        erro
          ? { data: null, error: erro }
          : { data: estado.dados, error: null },
      ).then(resolve),
  });

  return { supabase: { from: () => cadeia() } };
});

const { useRecurring } = await import('../useRecurring');

const regra = {
  id: 'regra-1',
  type: 'expense',
  amount: 89.9,
  currency: 'BRL',
  category: 'Gasto Fixo',
  description: 'Streaming',
  frequency: 'monthly',
  next_date: '2026-04-15',
  active: true,
};

describe('useRecurring > editar a regra', () => {
  it('manda só os campos editados e mantém a regra na lista', async () => {
    estado.dados = [regra];
    estado.atualizacoes = [];
    estado.erroAtualizacao = null;

    const { result } = renderHook(() => useRecurring());
    await waitFor(() => expect(result.current.recorrencias).toHaveLength(1));

    await act(async () => {
      const { error } = await result.current.atualizarRecorrencia('regra-1', {
        amount: 120,
        frequency: 'weekly',
        next_date: '2026-04-20',
      });
      expect(error).toBeNull();
    });

    expect(estado.atualizacoes).toEqual([
      { amount: 120, frequency: 'weekly', next_date: '2026-04-20' },
    ]);
    expect(result.current.recorrencias).toHaveLength(1);
    expect(result.current.recorrencias[0].id).toBe('regra-1');
  });

  it('devolve o erro quando a atualização falha', async () => {
    estado.dados = [regra];
    estado.erroAtualizacao = { message: 'permission denied' };

    const { result } = renderHook(() => useRecurring());
    await waitFor(() => expect(result.current.recorrencias).toHaveLength(1));

    let retorno;
    await act(async () => {
      retorno = await result.current.atualizarRecorrencia('regra-1', {
        amount: 10,
      });
    });

    expect(retorno.error).toBe('permission denied');
  });
});
