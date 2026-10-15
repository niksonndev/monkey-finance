import { AnimatePresence, motion } from 'framer-motion';
import { Smartphone, X } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

/**
 * Dica de instalação como uma janela flutuante no alto da tela.
 *
 * Flutua sobre o conteúdo (não empurra nada) e some no X — quem fecha só volta
 * a ver depois de alguns dias (ver useInstallPrompt). No celular ela nasce
 * abaixo da barra superior, que é fixa e mais alta que ela.
 */
const DICAS = {
  prompt: 'Abra direto da tela inicial, sem depender do navegador.',
  ios: 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".',
};

export default function InstallPrompt() {
  const { modo, instalar, dispensar } = useInstallPrompt();

  return (
    <div className='pointer-events-none fixed inset-x-0 top-[4.25rem] z-40 flex justify-center px-4 lg:top-6'>
      <AnimatePresence>
        {modo !== 'oculto' && (
          <motion.aside
            aria-label='Instalar o Monkey Finance'
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className='pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-monkey-primary/30 bg-monkey-card/95 p-3 shadow-xl shadow-black/40 backdrop-blur-sm'
          >
            <span className='flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-monkey-primary/15 text-monkey-primary'>
              <Smartphone className='h-5 w-5' />
            </span>

            <div className='min-w-0 flex-1'>
              <p className='font-semibold text-monkey-text'>
                Instalar o Monkey Finance
              </p>
              <p className='mt-0.5 text-sm text-monkey-muted'>{DICAS[modo]}</p>

              {modo === 'prompt' && (
                <button
                  type='button'
                  onClick={instalar}
                  className='btn-primary mt-2 px-3 py-1.5 text-sm'
                >
                  Instalar
                </button>
              )}
            </div>

            <button
              type='button'
              onClick={dispensar}
              aria-label='Fechar sugestão de instalação'
              className='rounded-lg p-1.5 text-monkey-muted transition-colors hover:bg-monkey-muted/10 hover:text-monkey-text'
            >
              <X className='h-4 w-4' />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
