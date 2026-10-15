import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useEscapeKey } from '../hooks/useEscapeKey';

/**
 * Confirmação de uma ação que não tem volta (excluir lançamento, encerrar
 * recorrência, excluir conta).
 *
 * Substitui o `window.confirm` do navegador, que no celular aparece como o
 * pop-up do sistema (com o nome do site e "OK/Cancelar"), some quando a pessoa
 * troca de app e não diz com clareza o que vai acontecer.
 *
 * Quem usa deve informar pelo menos `title`; `description`/`confirmLabel`
 * completam o texto. O foco vai para o botão de confirmar ao abrir, e Esc
 * cancela (o véu ou o botão "Cancelar" também).
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const confirmRef = useRef(null);

  useBodyScrollLock(isOpen);
  useEscapeKey(isOpen, onCancel);

  // Foco no botão principal: quem abriu já decidiu, e o teclado funciona.
  useEffect(() => {
    if (isOpen) confirmRef.current?.focus();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center p-4'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            onClick={onCancel}
          />

          <motion.div
            role='alertdialog'
            aria-modal='true'
            aria-labelledby='confirm-dialog-title'
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: 8,
              transition: { duration: 0.15 },
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className='relative z-10 w-full max-w-sm rounded-2xl border border-monkey-muted/30 bg-monkey-card p-5'
          >
            <div className='flex items-start gap-3'>
              <span className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-monkey-danger/15 text-monkey-danger'>
                <AlertCircle className='h-5 w-5' />
              </span>
              <div className='min-w-0'>
                <h2
                  id='confirm-dialog-title'
                  className='font-semibold text-monkey-text'
                >
                  {title}
                </h2>
                {description && (
                  <p className='mt-1 text-sm text-monkey-muted'>
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className='mt-5 flex gap-2'>
              <button
                type='button'
                onClick={onCancel}
                className='btn-secondary flex-1'
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type='button'
                onClick={onConfirm}
                disabled={loading}
                className='flex flex-1 items-center justify-center gap-2 rounded-lg border border-monkey-danger/30 bg-monkey-danger/15 px-4 py-2.5 font-semibold text-monkey-danger transition-colors hover:bg-monkey-danger/25 disabled:opacity-60'
              >
                {loading ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Aguarde...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
