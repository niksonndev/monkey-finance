import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInstallPrompt } from '../useInstallPrompt';

/**
 * A sugestão de instalação depende de coisas que só existem no navegador de
 * verdade: o evento `beforeinstallprompt` do Chrome, o `display-mode` do app
 * já instalado e o user-agent do iPhone (onde o evento nunca acontece). Aqui
 * cada um é simulado para cobrir os três caminhos.
 */

const DISPENSA_KEY = 'monkeynanca:instalar-dispensado';
const DIA = 24 * 60 * 60 * 1000;

const UA_DESKTOP =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const usarUserAgent = (ua) =>
  Object.defineProperty(window.navigator, 'userAgent', {
    value: ua,
    configurable: true,
  });

/** jsdom não implementa matchMedia: é por ele que o app se diz instalado. */
const simularInstalado = () => {
  window.matchMedia = (query) => ({
    matches: /standalone/.test(query),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
};

/** Evento no formato do Chrome, com o prompt e a escolha sob controle. */
function oferecerInstalacao(outcome = 'accepted') {
  const evento = new Event('beforeinstallprompt', { cancelable: true });
  evento.prompt = vi.fn();
  evento.userChoice = Promise.resolve({ outcome });
  act(() => {
    window.dispatchEvent(evento);
  });
  return evento;
}

beforeEach(() => {
  localStorage.clear();
  usarUserAgent(UA_DESKTOP);
  delete window.matchMedia;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useInstallPrompt', () => {
  it('fica oculto quando o navegador nem oferece a instalação', () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.modo).toBe('oculto');
  });

  it('aparece quando o Chrome oferece a instalação', () => {
    const { result } = renderHook(() => useInstallPrompt());

    oferecerInstalacao();

    expect(result.current.modo).toBe('prompt');
  });

  it('instala pelo prompt do navegador e sai da tela', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const evento = oferecerInstalacao('accepted');

    await act(async () => {
      await result.current.instalar();
    });

    expect(evento.prompt).toHaveBeenCalledTimes(1);
    expect(result.current.modo).toBe('oculto');
  });

  it('recusar na janela do navegador conta como dispensa', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    oferecerInstalacao('dismissed');

    await act(async () => {
      await result.current.instalar();
    });

    expect(result.current.modo).toBe('oculto');
    expect(Number(localStorage.getItem(DISPENSA_KEY))).toBeGreaterThan(0);

    // O navegador pode oferecer de novo logo em seguida: a janela não volta.
    oferecerInstalacao();
    expect(result.current.modo).toBe('oculto');
  });

  it('o X esconde a janela e o próximo convite do navegador é ignorado', () => {
    const { result } = renderHook(() => useInstallPrompt());
    oferecerInstalacao();

    act(() => result.current.dispensar());

    expect(Number(localStorage.getItem(DISPENSA_KEY))).toBeGreaterThan(0);
    expect(result.current.modo).toBe('oculto');

    const segundo = oferecerInstalacao();
    expect(result.current.modo).toBe('oculto');
    expect(segundo.defaultPrevented).toBe(false); // o convite nativo segue livre
  });

  it('volta a sugerir depois de uma semana', () => {
    localStorage.setItem(DISPENSA_KEY, String(Date.now() - 8 * DIA));
    const { result } = renderHook(() => useInstallPrompt());

    oferecerInstalacao();

    expect(result.current.modo).toBe('prompt');
  });

  it('no iPhone explica o caminho manual, sem o evento do Chrome', () => {
    usarUserAgent(UA_IPHONE);
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.modo).toBe('ios');
  });

  it('não aparece quando o app já está instalado', () => {
    simularInstalado();
    const { result } = renderHook(() => useInstallPrompt());

    oferecerInstalacao();

    expect(result.current.modo).toBe('oculto');
  });

  it('some sozinho quando a instalação termina', () => {
    const { result } = renderHook(() => useInstallPrompt());
    oferecerInstalacao();

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.modo).toBe('oculto');
  });
});
