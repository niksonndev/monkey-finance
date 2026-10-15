import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import InstallPrompt from '../InstallPrompt';

/** Janela flutuante de instalação: aparece, instala e pode ser removida. */

const DISPENSA_KEY = 'monkeynanca:instalar-dispensado';

const UA_DESKTOP =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const usarUserAgent = (ua) =>
  Object.defineProperty(window.navigator, 'userAgent', {
    value: ua,
    configurable: true,
  });

function oferecerInstalacao(outcome = 'accepted') {
  const evento = new Event('beforeinstallprompt', { cancelable: true });
  evento.prompt = vi.fn();
  evento.userChoice = Promise.resolve({ outcome });
  fireEvent(window, evento);
  return evento;
}

const janela = () => screen.queryByText('Instalar o Monkey Finance');

beforeEach(() => {
  localStorage.clear();
  usarUserAgent(UA_DESKTOP);
  delete window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('InstallPrompt', () => {
  it('não aparece quando não há instalação para sugerir', () => {
    render(<InstallPrompt />);

    expect(janela()).toBeNull();
  });

  it('aparece flutuando no alto com o convite e o botão de instalar', () => {
    render(<InstallPrompt />);

    oferecerInstalacao();

    expect(janela()).toBeTruthy();
    expect(
      screen.getByText(
        'Abra direto da tela inicial, sem depender do navegador.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Instalar' })).toBeTruthy();
  });

  it('instala pelo prompt do navegador e sai da tela', async () => {
    render(<InstallPrompt />);
    const evento = oferecerInstalacao();

    fireEvent.click(screen.getByRole('button', { name: 'Instalar' }));

    expect(evento.prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(janela()).toBeNull());
  });

  it('o X remove a janela e guarda que ela foi dispensada', async () => {
    render(<InstallPrompt />);
    oferecerInstalacao();

    fireEvent.click(
      screen.getByRole('button', { name: 'Fechar sugestão de instalação' }),
    );

    expect(Number(localStorage.getItem(DISPENSA_KEY))).toBeGreaterThan(0);
    await waitFor(() => expect(janela()).toBeNull());
  });

  it('no iPhone ensina o caminho manual, sem botão de instalar', () => {
    usarUserAgent(UA_IPHONE);
    render(<InstallPrompt />);

    expect(janela()).toBeTruthy();
    expect(
      screen.getByText(
        'Toque em Compartilhar e depois em "Adicionar à Tela de Início".',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Instalar' })).toBeNull();
  });
});
