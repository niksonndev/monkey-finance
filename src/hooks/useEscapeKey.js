import { useEffect } from 'react';

/**
 * Fecha a superfície aberta com Esc. O toque fora já é tratado pelo véu; isso
 * cobre quem usa teclado no computador, onde o Esc é o gesto esperado (antes só
 * saía clicando no X ou no véu).
 */
export function useEscapeKey(ativo, onFechar) {
  useEffect(() => {
    if (!ativo || !onFechar) return undefined;

    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') onFechar();
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [ativo, onFechar]);
}
