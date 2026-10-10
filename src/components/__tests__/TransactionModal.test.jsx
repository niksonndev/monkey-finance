import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TransactionModal from '../TransactionModal';

/**
 * O modal de transação precisa de contexto de auth e de moeda. Mockamos os
 * dois providers (em vez de renderizar a árvore toda) para isolar o
 * componente: o que importa aqui é o comportamento do formulário.
 */
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'teste-usuario', email: 'teste@exemplo.com' } }),
}));

vi.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'BRL' }),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
    }),
  },
}));

const modalCom = (props) => (
  <MemoryRouter>
    <TransactionModal
      isOpen
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      onSave={vi.fn().mockResolvedValue({ error: null })}
      {...props}
    />
  </MemoryRouter>
);

describe('TransactionModal', () => {
  it('abre em branco para nova transação', async () => {
    render(modalCom());
    await waitFor(() => {
      expect(screen.getByText('Nova Transação')).toBeTruthy();
    });
    expect(screen.getByLabelText('Valor').value).toBe('');
    expect(screen.getByLabelText('Descrição (opcional)').value).toBe('');
  });

  it('preenche o formulário com a transação ao editar', async () => {
    render(
      modalCom({
        transaction: {
          id: '1',
          type: 'income',
          amount: 150,
          category: 'Salário',
          description: 'Pagamento',
          date: '2026-10-05',
        },
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('Editar Transação')).toBeTruthy();
    });
    expect(screen.getByLabelText('Valor').value).toBe('150');
    expect(screen.getByLabelText('Descrição (opcional)').value).toBe(
      'Pagamento',
    );
    expect(screen.getByLabelText('Data').value).toBe('2026-10-05');
  });

  it('troca a lista de categorias ao trocar o tipo', async () => {
    render(modalCom());
    await waitFor(() => {
      expect(screen.getByText('Nova Transação')).toBeTruthy();
    });
    // Despesa (padrão): Gasto Fixo, Gasto do Dia a Dia...
    expect(screen.getByText('Gasto Fixo')).toBeTruthy();
    // Receita: Salário, Bico...
    fireEvent.click(screen.getByText('Receita'));
    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeTruthy();
    });
  });

  it('mostra erro ao salvar valor inválido', async () => {
    const onSave = vi.fn();
    render(modalCom({ onSave }));
    await waitFor(() => {
      expect(screen.getByText('Nova Transação')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText('Valor deve ser maior que zero')).toBeTruthy();
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});
