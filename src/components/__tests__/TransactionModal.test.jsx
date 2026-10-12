import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { addDays, format } from 'date-fns';
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
      expect(screen.getByText('Nova transação')).toBeTruthy();
    });
    expect(screen.getByLabelText('Valor').value).toBe('');
    expect(screen.getByLabelText(/Descrição/).value).toBe('');
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
      expect(screen.getByText('Editar transação')).toBeTruthy();
    });
    expect(screen.getByLabelText('Valor').value).toBe('150');
    expect(screen.getByLabelText(/Descrição/).value).toBe('Pagamento');
    expect(screen.getByLabelText('Data').value).toBe('2026-10-05');
  });

  it('troca a lista de categorias ao trocar o tipo', async () => {
    render(modalCom());
    await waitFor(() => {
      expect(screen.getByText('Nova transação')).toBeTruthy();
    });
    // Despesa (padrão): Gasto Fixo...
    expect(screen.getByText('Gasto Fixo')).toBeTruthy();
    // Receita: Salário...
    fireEvent.click(screen.getByRole('button', { name: 'Receita' }));
    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeTruthy();
    });
  });

  it('trocar o tipo troca a categoria pela primeira da lista nova', async () => {
    render(modalCom());
    await waitFor(() => {
      expect(screen.getByText('Nova transação')).toBeTruthy();
    });
    expect(screen.getByLabelText('Categoria').value).toBe('Gasto Fixo');

    fireEvent.click(screen.getByRole('button', { name: 'Receita' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Categoria').value).toBe('Salário');
    });
  });

  it('preserva a categoria de um lançamento antigo que saiu da lista', async () => {
    // O caso real: lançamento gravado quando as opções eram outras (ou sem
    // categoria, que a lista chama de "Sem categoria"). Ao editar, a categoria
    // era trocada pela primeira da lista durante o render e salva assim mesmo.
    const onSave = vi.fn().mockResolvedValue({ error: null });
    render(
      modalCom({
        onSave,
        transaction: {
          id: '9',
          type: 'expense',
          amount: 20,
          category: 'Outros',
          description: 'mercado',
          date: '2026-10-05',
        },
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('Editar transação')).toBeTruthy();
    });

    expect(screen.getByLabelText('Categoria').value).toBe('Outros');

    fireEvent.click(screen.getByRole('button', { name: /Atualizar/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].category).toBe('Outros');
  });

  it('mostra erro ao salvar valor inválido', async () => {
    const onSave = vi.fn();
    render(modalCom({ onSave }));
    await waitFor(() => {
      expect(screen.getByText('Nova transação')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));
    await waitFor(() => {
      expect(
        screen.getByText('Informe um valor maior que zero'),
      ).toBeTruthy();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('não oferece troca de moeda (isso fica em Configurações)', async () => {
    render(modalCom());
    await waitFor(() => {
      expect(screen.getByText('Nova transação')).toBeTruthy();
    });
    // O símbolo da moeda ativa aparece dentro do campo de valor...
    expect(screen.getByText('−R$')).toBeTruthy();
    // ...mas não existe controle nenhum para escolher outra moeda.
    expect(screen.queryByLabelText('Moeda')).toBeNull();
    expect(screen.queryByText('Real brasileiro')).toBeNull();
  });

  it('atalhos de data mudam a data do formulário', async () => {
    // Dia local, não UTC: `toISOString()` devolveria o dia seguinte quando o
    // teste roda depois das 21h no Brasil, e ele falharia sozinho à noite.
    const isoOntem = format(addDays(new Date(), -1), 'yyyy-MM-dd');

    render(modalCom());
    await waitFor(() => {
      expect(screen.getByText('Nova transação')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ontem' }));
    expect(screen.getByLabelText('Data').value).toBe(isoOntem);
  });

  it('abre com a data de hoje no fuso do aparelho', async () => {
    // Mesma armadilha do teste acima, agora no valor padrão do campo: à noite,
    // o lançamento nascia com a data de amanhã (e no fim do mês, no mês
    // seguinte).
    const agora = new Date();
    const hojeLocal = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;

    render(modalCom());
    await waitFor(() => {
      expect(screen.getByText('Nova transação')).toBeTruthy();
    });
    expect(screen.getByLabelText('Data').value).toBe(hojeLocal);
  });

  it('fecha com Esc e devolve a rolagem ao fechar', async () => {
    const onClose = vi.fn();
    const { unmount } = render(modalCom({ onClose }));
    await waitFor(() => {
      expect(screen.getByText('Nova transação')).toBeTruthy();
    });

    // Enquanto a folha está aberta, o documento fica preso no lugar (sem isso
    // o gesto por dentro do modal empurrava a página de trás).
    expect(document.body.style.position).toBe('fixed');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.body.style.position).toBe('');
  });

  it('switch de recorrência revela a frequência', async () => {
    render(modalCom());
    await waitFor(() => {
      expect(screen.getByText('Nova transação')).toBeTruthy();
    });

    const sw = screen.getByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByText('Todo mês')).toBeNull();

    fireEvent.click(sw);
    await waitFor(() => {
      expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe(
        'true',
      );
    });
    expect(screen.getByRole('button', { name: 'Todo mês' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Toda semana' })).toBeTruthy();
  });
});
