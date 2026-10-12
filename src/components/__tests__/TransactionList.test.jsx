import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import TransactionList from '../TransactionList';

// Só o formatador de moeda importa aqui: o componente é testado sem o app.
vi.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({ formatValue: (valor) => `R$ ${Number(valor).toFixed(2)}` }),
}));

afterEach(cleanup);

const lancamento = {
  id: 't1',
  type: 'expense',
  amount: 50,
  category: 'Gasto Fixo',
  description: 'Mercado',
  date: '2026-03-10',
};

describe('TransactionList > falha de carga', () => {
  it('mostra o aviso no lugar da lista vazia quando o erro não traz dado', () => {
    render(<TransactionList transactions={[]} error='Failed to fetch' />);

    expect(
      screen.getByText('Não foi possível carregar seus lançamentos'),
    ).toBeTruthy();
    // A tela antiga dizia "Nenhuma transação", como se o usuário não tivesse
    // lançamentos.
    expect(screen.queryByText('Nenhuma transação')).toBeNull();
  });

  it('mantém a lista em tela e avisa que a atualização falhou', () => {
    render(
      <TransactionList transactions={[lancamento]} error='Failed to fetch' />,
    );

    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain(
      'últimos carregados',
    );
  });

  it('o botão de tentar de novo chama a recarga', () => {
    const onRetry = vi.fn();
    render(
      <TransactionList transactions={[]} error='Failed to fetch' onRetry={onRetry} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sem erro e sem lançamento continua mostrando a lista vazia', () => {
    render(<TransactionList transactions={[]} />);

    expect(screen.getByText('Nenhuma transação')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
