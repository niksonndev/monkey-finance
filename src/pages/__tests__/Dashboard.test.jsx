import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { format } from 'date-fns';
import Dashboard from '../Dashboard';

/**
 * A página é montada de verdade (hook, filtros, lista e modal) contra um
 * Supabase de mentira. Existe para guardar a ligação entre as peças: as telas
 * de Dashboard e Transações passaram a compartilhar o mesmo hook de página, e
 * uma troca de nome ou de prop só aparece aqui.
 */
const estado = vi.hoisted(() => ({
  transacoes: [],
  erro: null,
  // Objeto fixo: identidade estável, senão o efeito do hook busca em laço.
  usuario: { id: 'usuario-teste', email: 'teste@exemplo.com' },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: estado.usuario }),
}));

vi.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({
    currency: 'BRL',
    formatValue: (valor) => `R$ ${Number(valor).toFixed(2)}`,
  }),
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
        then: (resolve) =>
          Promise.resolve({
            data: tabela === 'recurring_transactions' ? [] : estado.transacoes,
            // O supabase-js devolve o erro como objeto com message.
            error: estado.erro ? { message: estado.erro } : null,
          }).then(resolve),
      };
      return cadeia;
    },
  },
}));

// O gráfico não é o assunto deste teste e o jsdom não tem canvas.
vi.mock('react-chartjs-2', () => ({ Doughnut: () => null }));

afterEach(cleanup);

/** Lançamento no mês que está aberto (hoje) e outro bem fora dele. */
const doMes = {
  id: 't1',
  type: 'expense',
  amount: 50,
  category: 'Gasto Fixo',
  description: 'Mercado do mês',
  date: `${format(new Date(), 'yyyy-MM')}-05`,
};
const deOutroMes = {
  id: 't2',
  type: 'expense',
  amount: 10,
  category: 'Gasto Fixo',
  description: 'Mercado de 2020',
  date: '2020-01-05',
};

const montar = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );

describe('Dashboard', () => {
  it('lista as transações do mês aberto e ignora as de outro mês', async () => {
    estado.transacoes = [doMes, deOutroMes];
    estado.erro = null;

    montar();

    await waitFor(() =>
      expect(screen.getByText('Mercado do mês')).toBeTruthy(),
    );
    expect(screen.queryByText('Mercado de 2020')).toBeNull();
  });

  it('abre o modal de lançamento pelo botão do mês', async () => {
    estado.transacoes = [];
    estado.erro = null;

    montar();
    await waitFor(() =>
      expect(screen.getByText('Transações do mês')).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole('button', { name: /Nova transação/ }));

    // O campo de valor só existe dentro do modal de lançamento.
    await waitFor(() => expect(screen.getByLabelText('Valor')).toBeTruthy());
  });

  it('avisa quando a busca falha em vez de dizer que não há lançamentos', async () => {
    estado.transacoes = [];
    estado.erro = 'Failed to fetch';

    montar();

    await waitFor(() =>
      expect(
        screen.getByText('Não foi possível carregar seus lançamentos'),
      ).toBeTruthy(),
    );
    expect(screen.queryByText('Nenhuma transação')).toBeNull();
  });
});
