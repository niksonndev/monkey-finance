import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import {
  CATEGORY_COLORS,
  DEFAULT_CHART_COLORS,
} from '../constants/categories';
import { useCurrency } from '../context/CurrencyContext';

// Só o que a rosca precisa: a legenda nativa do Chart.js não é usada (a lista
// abaixo do gráfico já é a legenda), então Legend fica de fora do registro.
ChartJS.register(ArcElement, Tooltip);

/** Porcentagem no padrão pt-BR: vírgula decimal e sem ",0" sobrando. */
const formatPercent = (valor) =>
  `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/**
 * Gráfico de rosca por categoria.
 *
 * A legenda é uma lista própria em vez da nativa do Chart.js: ela cabe valor e
 * porcentagem (a nativa só repete cor e nome), sai ordenada da maior fatia para
 * a menor e usa o padrão pt-BR. O total ocupa o vão central da rosca, que de
 * outra forma ficaria vazio.
 */
export default function PieChart({
  data,
  labels,
  title,
  emptyMessage = 'Nenhum dado disponível',
}) {
  const { formatValue } = useCurrency();

  // Ordena por valor e descarta fatia zerada: categoria sem lançamento no mês
  // não precisa ocupar linha na legenda.
  const slices = useMemo(() => {
    if (!Array.isArray(data) || !Array.isArray(labels)) return [];

    return labels
      .map((label, index) => ({
        label,
        value: Number(data[index]) || 0,
        color:
          CATEGORY_COLORS[label] ||
          DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length],
      }))
      .filter((slice) => slice.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, labels]);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const chartData = {
    labels: slices.map((slice) => slice.label),
    datasets: [
      {
        data: slices.map((slice) => slice.value),
        backgroundColor: slices.map((slice) => slice.color),
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#16213e',
        titleColor: '#e8e8e8',
        bodyColor: '#e8e8e8',
        borderColor: '#6b6b8a',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const value = context.raw;
            return `${context.label}: ${formatValue(value)} (${formatPercent(
              (value / total) * 100,
            )})`;
          },
        },
      },
    },
  };

  return (
    <div className='card'>
      {/* O título aparece mesmo sem dados: sem ele, dois cards vazios no
          dashboard ficariam indistinguíveis. */}
      {title && (
        <h3 className='text-lg font-semibold text-monkey-text mb-4'>{title}</h3>
      )}

      {slices.length === 0 ? (
        <div className='flex items-center justify-center min-h-[140px] px-2'>
          <p className='text-monkey-muted text-sm text-center'>
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className='flex flex-col items-center gap-4'>
          {/* Gráfico. Empilhado em TODAS as larguras: a coluna do dashboard tem
              320px, e lado a lado o nome da categoria não cabia na lista (saía
              truncado em "G..."). */}
          <div className='relative h-[200px] w-full'>
            <Doughnut data={chartData} options={options} />

            {/* Total no vão central da rosca */}
            <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center'>
              <span className='text-[10px] uppercase tracking-wide text-monkey-muted'>
                Total
              </span>
              <span className='text-sm font-semibold text-monkey-text tabular-nums leading-tight'>
                {formatValue(total)}
              </span>
            </div>
          </div>

          {/* Legenda: mesma ordem das fatias, com valor e porcentagem */}
          <div className='w-full space-y-2'>
            {slices.map((slice) => (
              <div key={slice.label} className='flex items-center gap-2 text-sm'>
                <span
                  aria-hidden='true'
                  className='w-3 h-3 rounded-full flex-shrink-0'
                  style={{ backgroundColor: slice.color }}
                />
                <span className='text-monkey-text truncate'>{slice.label}</span>
                <span className='ml-auto font-medium text-monkey-text tabular-nums whitespace-nowrap'>
                  {formatValue(slice.value)}
                </span>
                <span className='w-11 text-right text-xs text-monkey-muted tabular-nums'>
                  {formatPercent((slice.value / total) * 100)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
