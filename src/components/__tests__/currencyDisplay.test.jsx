import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, cleanup, waitFor } from '@testing-library/react';

// O CurrencyProvider usa o AuthContext apenas para saber a chave da preferência
// da moeda — mockamos para não depender de Supabase/sessão.
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'usuario-teste' } }),
}));

import { CurrencyProvider, useCurrency } from '../../context/CurrencyContext';
import TransactionList from '../TransactionList';
import DashboardCards from '../DashboardCards';

const transacao = {
  id: 't1',
  type: 'expense',
  amount: 50,
  category: 'Gasto Fixo',
  description: 'Mercado',
  date: '2026-03-10',
  currency: 'BRL',
};

/** O Intl usa espaço inseparável entre símbolo e número; normalizamos. */
const texto = (container) => container.textContent.replace(/\u00A0/g, ' ');

/**
 * Renderiza o app (provider) com os componentes e devolve a API da moeda, para
 * trocar a unidade depois da montagem — igual ao que a tela de Configurações
 * faz quando o usuário escolhe outra moeda.
 */
function montar(children) {
  let moedaApi;
  function Espiao() {
    moedaApi = useCurrency();
    return null;
  }

  const resultado = render(
    <CurrencyProvider>
      <Espiao />
      {children}
    </CurrencyProvider>,
  );

  return { ...resultado, api: () => moedaApi };
}

afterEach(cleanup);

// Cada teste começa sem preferência salva (o armazenamento de teste é
// compartilhado entre os casos do mesmo arquivo).
beforeEach(() => {
  localStorage.clear();
});

describe('moeda global do app', () => {
  it('começa em reais', async () => {
    const { container } = montar(
      <TransactionList transactions={[transacao]} onEdit={() => {}} />,
    );

    await waitFor(() => expect(texto(container)).toContain('R$ 50,00'));
  });

  it('troca a unidade da lista inteira ao mudar para euro', async () => {
    const { container, api } = montar(
      <TransactionList transactions={[transacao]} onEdit={() => {}} />,
    );
    await waitFor(() => expect(api().currency).toBe('BRL'));

    act(() => api().setCurrency('EUR'));

    await waitFor(() => expect(texto(container)).toContain('€ 50,00'));
    expect(texto(container)).not.toContain('R$');
    // a escolha fica salva por usuário (sobrevive ao fechar o app)
    expect(localStorage.getItem('monkeynanca:currency:usuario-teste')).toBe(
      'EUR',
    );
  });

  it('os cards do dashboard seguem a moeda do app', async () => {
    const { container, api } = montar(
      <DashboardCards
        stats={{ balance: 1234.5, income: 2000, expenses: 765.5 }}
      />,
    );
    await waitFor(() => expect(api().currency).toBe('BRL'));

    act(() => api().setCurrency('USD'));

    // Em pt-BR o dólar aparece como US$
    await waitFor(() => expect(texto(container)).toContain('US$ 1.234,50'));
    expect(texto(container)).toContain('US$ 2.000,00');
  });
});
