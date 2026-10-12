import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';

afterEach(cleanup);

const montar = (props = {}) =>
  render(
    <ConfirmDialog
      isOpen
      title='Excluir esta transação?'
      description='Mercado sai da sua lista.'
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />,
  );

describe('ConfirmDialog', () => {
  it('mostra título e descrição quando aberto e some quando fechado', () => {
    const { unmount } = montar();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('Mercado sai da sua lista.')).toBeTruthy();

    unmount();
    montar({ isOpen: false });
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('confirma e cancela pelos botões', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    montar({ onConfirm, onCancel, confirmLabel: 'Excluir' });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancela com Esc (o window.confirm não tinha como, e o teclado ficava preso)', () => {
    const onCancel = vi.fn();
    montar({ onCancel });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('bloqueia o botão de confirmar enquanto a ação roda', () => {
    const onConfirm = vi.fn();
    montar({ onConfirm, loading: true });

    const botao = screen.getByRole('button', { name: /Aguarde/ });
    expect(botao.disabled).toBe(true);
    fireEvent.click(botao);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
