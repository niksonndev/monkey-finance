import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Sugestão de instalação do PWA (o "adicionar à tela inicial").
 *
 * O convite só existe quando dá para instalar: no Chrome/Edge/Android é o
 * evento `beforeinstallprompt` que diz isso, e no iPhone/iPad esse evento não
 * existe — lá a interface ensina o caminho manual (Compartilhar → Adicionar à
 * Tela de Início). Quem já roda instalado (janela própria, sem barra de
 * endereço) não vê nada.
 *
 * Fechar a janela não é para sempre: ela volta depois de alguns dias, senão
 * quem tocou no X sem querer nunca mais veria o convite.
 */

const DISPENSA_KEY = 'monkeynanca:instalar-dispensado';
const DIAS_ATE_VOLTAR = 7;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** O app está aberto instalado (janela própria) e não numa aba do navegador. */
function estaInstalado() {
  if (typeof window === 'undefined') return false;
  if (window.navigator.standalone === true) return true; // iOS antigo
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/** iPhone/iPad: o Safari não dispara `beforeinstallprompt`. */
function ehIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // No iPad recente o Safari se identifica como Mac; o toque na tela denuncia.
  const ipadComoCaroMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || ipadComoCaroMac;
}

function lerDispensa() {
  try {
    const bruto = Number(localStorage.getItem(DISPENSA_KEY));
    return Number.isFinite(bruto) && bruto > 0 ? bruto : 0;
  } catch (erro) {
    console.error('Erro ao ler a dispensa da instalação:', erro);
    return 0;
  }
}

function salvarDispensa(quando) {
  try {
    localStorage.setItem(DISPENSA_KEY, String(quando));
  } catch (erro) {
    console.error('Erro ao salvar a dispensa da instalação:', erro);
  }
}

function dispensadoPoucoTempoAtras(quando) {
  return quando > 0 && Date.now() - quando < DIAS_ATE_VOLTAR * MS_POR_DIA;
}

/**
 * Estado da sugestão de instalação. Devolve `modo` — 'prompt' quando o
 * navegador oferece o botão, 'ios' quando só resta a dica manual e 'oculto'
 * quando não há o que sugerir — além de `instalar` e `dispensar` para os
 * botões da janela.
 */
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [instalado, setInstalado] = useState(estaInstalado);
  const [dispensadoEm, setDispensadoEm] = useState(lerDispensa);

  useEffect(() => {
    const aoPoderInstalar = (evento) => {
      // Já dispensou (ou já tem instalado): deixa o próprio navegador oferecer
      // a instalação, sem segurar o evento.
      if (estaInstalado() || dispensadoPoucoTempoAtras(lerDispensa())) return;
      evento.preventDefault(); // segura a faixa nativa; a sugestão é a nossa
      setPromptEvent(evento);
    };

    const aoInstalar = () => {
      const agora = Date.now();
      salvarDispensa(agora); // instalado: não precisa mais convidar
      setDispensadoEm(agora);
      setInstalado(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    window.addEventListener('appinstalled', aoInstalar);

    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  const dispensar = useCallback(() => {
    const agora = Date.now();
    salvarDispensa(agora);
    setDispensadoEm(agora);
  }, []);

  const instalar = useCallback(async () => {
    if (!promptEvent) return;

    const evento = promptEvent;
    setPromptEvent(null); // o prompt do navegador só pode ser usado uma vez

    try {
      evento.prompt();
      const { outcome } = await evento.userChoice;
      // Recusou na janela do navegador: não volta a insistir tão cedo.
      if (outcome !== 'accepted') dispensar();
    } catch (erro) {
      console.error('Não foi possível abrir a instalação:', erro);
    }
  }, [promptEvent, dispensar]);

  const modo = useMemo(() => {
    if (instalado || dispensadoPoucoTempoAtras(dispensadoEm)) return 'oculto';
    if (promptEvent) return 'prompt';
    if (ehIos()) return 'ios';
    return 'oculto';
  }, [instalado, dispensadoEm, promptEvent]);

  return { modo, instalar, dispensar };
}
