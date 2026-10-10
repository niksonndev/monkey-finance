import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Filters from '../Filters';

vi.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'BRL', formatValue: (v) => `R$ ${v}` }),
}));

const filtrosPadrao = {
  type: '',
  category: '',
  dateFrom: '',
  dateTo: '',
  search: '',
  sortBy: 'date_desc',
  minAmount: '',
  maxAmount: '',
};

const montar = (props = {}) => {
  const onFiltersChange = vi.fn();
  render(
    <Filters
      filters={filtrosPadrao}
      onFiltersChange={onFiltersChange}
      transactions={[
        { category: 'Mercado', type: 'expense' },
        { category: 'Salário', type: 'income' },
      ]}
      {...props}
    />,
  );
  return { onFiltersChange };
};

describe('Filters', () => {
  it('busca é o campo principal, com rótulo acessível', () => {
    montar();
    expect(screen.getByLabelText('Buscar transações')).toBeTruthy();
  });

  it('tipo usa pílulas que marcam o estado pressionado', () => {
    const { onFiltersChange } = montar();
    const receitas = screen.getByRole('button', { name: 'Receitas' });
    expect(receitas.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(receitas);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'income' }),
    );
  });

  it('digitar na busca avisa a mudança', () => {
    const { onFiltersChange } = montar();
    fireEvent.change(screen.getByLabelText('Buscar transações'), {
      target: { value: 'mercado' },
    });
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'mercado' }),
    );
  });

  it('mostra chips dos filtros ativos e remove um só', async () => {
    const onFiltersChange = vi.fn();
    render(
      <Filters
        filters={{ ...filtrosPadrao, type: 'income', search: 'academia' }}
        onFiltersChange={onFiltersChange}
        transactions={[{ category: 'Salário', type: 'income' }]}
      />,
    );

    // os dois filtros ativos aparecem como chips
    const chips = screen.getAllByTitle('Remover este filtro');
    expect(chips).toHaveLength(2);

    // remover o chip da busca limpa só a busca
    const chipBusca = screen.getByText(/academia/);
    fireEvent.click(chipBusca);
    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: '', type: 'income' }),
      );
    });
  });

  it('período e valor ficam escondidos até abrir as opções', () => {
    montar();
    expect(screen.queryByLabelText('De')).toBeNull();

    fireEvent.click(screen.getByText(/Período, valor e ordenação/));

    expect(screen.getByLabelText('De')).toBeTruthy();
    expect(screen.getByLabelText('Até')).toBeTruthy();
    expect(screen.getByLabelText('Ordenar por')).toBeTruthy();
  });
});
