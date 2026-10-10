import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit, CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import {
  agruparPorDia,
  rotuloDoDia,
  saldoDoDia,
} from '../utils/transactionGroups';

const TYPE_LABELS = {
  income: 'Receita',
  expense: 'Despesa',
};

const TYPE_BAR = {
  income: 'bg-monkey-success',
  expense: 'bg-monkey-danger',
};

const TYPE_TEXT = {
  income: 'text-monkey-success',
  expense: 'text-monkey-danger',
};

export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
  loading,
}) {
  const [deletingId, setDeletingId] = useState(null);
  const { formatValue } = useCurrency();

  /**
   * A entrada animada (fade + deslize) vale para a primeira vez que a lista
   * aparece. Em filtro, reanimar TODAS as linhas era o que causava a sensação
   * de "glitch": a cada tecla na busca ou troca de pílula, as linhas sumiam e
   * reapareciam em ondas, e a altura da página mexia sozinha, jogando o scroll
   * para cima ou para baixo. Fora da primeira montagem, quem movimenta as
   * linhas é o `layout` (deslizamento suave), não uma reentrada.
   */
  const [jaApareceu, setJaApareceu] = useState(false);
  const animarEntrada = !jaApareceu;
  // Efeito só para marcar que a primeira passada aconteceu: a partir daí as
  // linhas deixam de reanimar em bloco (o `layout` cuida do reposicionamento).
  useEffect(() => {
    if (!jaApareceu) setJaApareceu(true);
  }, [jaApareceu]);

  // Confirmação fica a cargo da página (onDelete); aqui apenas
  // mostramos o spinner enquanto a exclusão está em andamento.
  const handleDeleteClick = async (id) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className='space-y-2'>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className='flex items-center gap-3 py-3 animate-pulse'
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className='w-1 h-9 bg-monkey-muted/20 rounded-full' />
            <div className='flex-1 space-y-2'>
              <div className='h-3.5 bg-monkey-muted/20 rounded w-2/5' />
              <div className='h-3 bg-monkey-muted/20 rounded w-1/4' />
            </div>
            <div className='h-4 w-20 bg-monkey-muted/20 rounded' />
          </div>
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className='flex flex-col items-center justify-center py-12 text-center'
      >
        <div className='w-16 h-16 bg-monkey-muted/10 rounded-full flex items-center justify-center mb-4'>
          <CreditCard className='w-8 h-8 text-monkey-muted' />
        </div>
        <h3 className='text-lg font-medium text-monkey-text mb-1'>
          Nenhuma transação
        </h3>
        <p className='text-monkey-muted text-sm'>
          Comece adicionando sua primeira transação
        </p>
      </motion.div>
    );
  }

  return (
    <div className='space-y-4'>
      {agruparPorDia(transactions).map((grupo) => {
        const saldo = saldoDoDia(grupo.itens);

        return (
          <motion.section
            key={grupo.dia}
            layout='position'
            initial={animarEntrada ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className='flex items-baseline justify-between gap-3 px-1 mb-1'>
              <h3 className='text-xs font-semibold uppercase tracking-wide text-monkey-muted'>
                {rotuloDoDia(grupo.dia)}
              </h3>
              <span
                className={`text-xs font-medium tabular-nums ${
                  saldo >= 0 ? 'text-monkey-success' : 'text-monkey-danger'
                }`}
              >
                {saldo >= 0 ? '+' : '-'}
                {formatValue(Math.abs(saldo))}
              </span>
            </div>

            <div className='divide-y divide-monkey-muted/10'>
              <AnimatePresence initial={false}>
                {grupo.itens.map((transaction) => {
                  const receita = transaction.type === 'income';
                  const horario = transaction.created_at
                    ? `Criado em ${format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                    : undefined;

                  return (
                    <motion.div
                      key={transaction.id}
                      layout='position'
                      initial={animarEntrada ? { opacity: 0, y: 8 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      title={horario}
                      className='flex items-center gap-3 py-3'
                    >
                      <span
                        className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                          TYPE_BAR[transaction.type]
                        }`}
                      />

                      <div className='flex-1 min-w-0'>
                        <span className='block font-medium text-monkey-text text-sm line-clamp-2 break-words'>
                          {transaction.description ||
                            transaction.category ||
                            'Sem categoria'}
                        </span>
                        <div className='mt-0.5 flex items-center gap-1.5'>
                          {transaction.description && (
                            <span className='text-xs text-monkey-muted truncate'>
                              {transaction.category || 'Sem categoria'}
                            </span>
                          )}
                          <span className='text-[11px] leading-4 px-2 rounded bg-monkey-muted/15 text-monkey-muted flex-shrink-0'>
                            {TYPE_LABELS[transaction.type]}
                          </span>
                        </div>
                      </div>

                      <div className='flex flex-col items-end flex-shrink-0'>
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            TYPE_TEXT[transaction.type]
                          }`}
                        >
                          {receita ? '+' : '-'}
                          {formatValue(transaction.amount)}
                        </span>

                        <div className='flex items-center -mr-1.5'>
                          <button
                            onClick={() => onEdit(transaction)}
                            className='p-1.5 rounded-md text-monkey-muted hover:bg-monkey-muted/10 hover:text-monkey-text transition-colors'
                            aria-label='Editar transação'
                          >
                            <Edit className='w-3.5 h-3.5' />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(transaction.id)}
                            disabled={deletingId === transaction.id}
                            className='p-1.5 rounded-md text-monkey-muted hover:bg-monkey-danger/10 hover:text-monkey-danger transition-colors'
                            aria-label='Excluir transação'
                          >
                            {deletingId === transaction.id ? (
                              <Loader2 className='w-3.5 h-3.5 animate-spin' />
                            ) : (
                              <Trash2 className='w-3.5 h-3.5' />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
