import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Navegação de mês compartilhada (mês anterior / atual / próximo).
 * `actions` recebe botões extras (ex.: exportar CSV, nova transação).
 */
export default function MonthNavigator({
  onPrev,
  onNext,
  onCurrent,
  actions,
}) {
  return (
    <div className='flex items-center gap-2 sm:gap-3 flex-wrap'>
      <button
        onClick={onPrev}
        className='p-2 rounded-lg bg-monkey-card border border-monkey-muted/30 text-monkey-muted hover:text-monkey-text hover:border-monkey-primary/50 transition-colors'
        aria-label='Mês anterior'
      >
        <ChevronLeft className='w-5 h-5' />
      </button>
      <button
        onClick={onCurrent}
        className='px-3 sm:px-4 py-2 rounded-lg bg-monkey-card border border-monkey-muted/30 text-monkey-text text-sm font-medium hover:border-monkey-primary/50 transition-colors'
      >
        Mês atual
      </button>
      <button
        onClick={onNext}
        className='p-2 rounded-lg bg-monkey-card border border-monkey-muted/30 text-monkey-muted hover:text-monkey-text hover:border-monkey-primary/50 transition-colors'
        aria-label='Próximo mês'
      >
        <ChevronRight className='w-5 h-5' />
      </button>
      {actions}
    </div>
  );
}
