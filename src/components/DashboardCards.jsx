import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrency } from '../context/CurrencyContext';

const cards = [
  {
    title: 'Saldo Total',
    value: 'balance',
    icon: Wallet,
    color: 'text-monkey-primary',
    bg: 'bg-monkey-primary/10',
    prefix: '',
  },
  {
    title: 'Receitas',
    value: 'income',
    icon: TrendingUp,
    color: 'text-monkey-success',
    bg: 'bg-monkey-success/10',
    prefix: '+',
  },
  {
    title: 'Despesas',
    value: 'expenses',
    icon: TrendingDown,
    color: 'text-monkey-danger',
    bg: 'bg-monkey-danger/10',
    prefix: '-',
  },
];

/**
 * Resumo do mês (saldo, receitas, despesas).
 *
 * Cards em linha, com ícone à esquerda e o valor ao lado: empilhados em coluna
 * cheia, os três ocupavam quase a tela inteira no celular e empurravam a lista
 * de transações para fora da primeira rolagem. No celular o saldo ocupa a linha
 * toda e receitas/despesas dividem a de baixo; a partir de sm os três ficam
 * lado a lado, como no desktop.
 */
export default function DashboardCards({ stats }) {
  const { formatValue } = useCurrency();

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4'>
      {cards.map((card, index) => {
        const destaque = card.value === 'balance';
        const negativo = card.value === 'balance' && stats.balance < 0;

        return (
          <motion.div
            key={card.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`card flex items-center gap-3 p-3 sm:p-4 ${
              destaque ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <div className={`shrink-0 rounded-xl p-2 sm:p-2.5 ${card.bg}`}>
              <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
            </div>

            <div className='min-w-0'>
              <p className='truncate text-xs text-monkey-muted'>{card.title}</p>
              <p
                className={`truncate text-base font-bold tabular-nums sm:text-lg ${
                  negativo ? 'text-monkey-danger' : 'text-monkey-text'
                }`}
              >
                {`${card.prefix}${formatValue(stats[card.value])}`}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
