import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ChevronDown,
  ArrowUpDown,
  SlidersHorizontal,
  Calendar,
  Tag,
  Coins,
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';
import { currencyInfo } from '../constants/currencies';

/**
 * Barra de filtros.
 *
 * Hierarquia: a busca é o campo principal (é o que quase todo mundo usa), e o
 * resto fica em segmentos compactos + um grupo "mais" que abre valor e
 * ordenação. Cada filtro ativo aparece como chip removível, então dá para
 * desfazer um só sem sair limpando tudo.
 *
 * Sem `layoutId` no destaque das pílulas: a animação compartilhada desmonta o
 * destaque de um botão e remonta no outro a cada clique, o que aparecia como
 * um piscar (glitch) junto da troca de estado. A cor de fundo mudando já
 * comunica a seleção.
 */

/** Segmento de opções (tipo): pílulas que marcam a ativa. */
function Segmented({ value, options, onChange, ariaLabel }) {
  return (
    <div
      role='group'
      aria-label={ariaLabel}
      className='inline-flex w-full rounded-lg bg-monkey-bg/60 p-0.5 border border-monkey-muted/25'
    >
      {options.map((opt) => {
        const ativo = value === opt.value;
        return (
          <button
            key={opt.value}
            type='button'
            onClick={() => onChange(opt.value)}
            aria-pressed={ativo}
            className={`flex-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              ativo
                ? 'bg-monkey-primary text-monkey-bg'
                : 'text-monkey-muted hover:text-monkey-text'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Campo com ícone e rótulo curto acima (usado em datas e valores). */
function LabeledField({ label, icon: Icon, children }) {
  return (
    <label className='block'>
      <span className='mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-monkey-muted'>
        {Icon && <Icon className='h-3 w-3' />}
        {label}
      </span>
      {children}
    </label>
  );
}

export default function Filters({
  filters,
  onFiltersChange,
  onClearFilters,
  transactions = [],
  loading = false,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { formatValue, currency } = useCurrency();

  const categorias = [
    ...new Set(transactions.map((t) => t.category).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const aplicar = (patch) => onFiltersChange({ ...filters, ...patch });

  // Chips dos filtros ativos: cada um some com um clique, sem precisar caçar
  // qual controle desmarcar. `onRemove` é opcional porque ordenação não é
  // "filtro" no sentido de restringir a lista.
  const chips = [
    filters.type && {
      key: 'type',
      label: filters.type === 'income' ? 'Receitas' : 'Despesas',
      onRemove: () => aplicar({ type: '' }),
    },
    filters.category && {
      key: 'category',
      label: filters.category,
      onRemove: () => aplicar({ category: '' }),
    },
    filters.dateFrom && {
      key: 'dateFrom',
      label: `De ${format(parseLocalDate(filters.dateFrom), 'dd/MM/yyyy', { locale: ptBR })}`,
      onRemove: () => aplicar({ dateFrom: '' }),
    },
    filters.dateTo && {
      key: 'dateTo',
      label: `Até ${format(parseLocalDate(filters.dateTo), 'dd/MM/yyyy', { locale: ptBR })}`,
      onRemove: () => aplicar({ dateTo: '' }),
    },
    filters.minAmount && {
      key: 'minAmount',
      label: `Mín ${formatValue(filters.minAmount)}`,
      onRemove: () => aplicar({ minAmount: '' }),
    },
    filters.maxAmount && {
      key: 'maxAmount',
      label: `Máx ${formatValue(filters.maxAmount)}`,
      onRemove: () => aplicar({ maxAmount: '' }),
    },
    filters.search && {
      key: 'search',
      label: `“${filters.search}”`,
      onRemove: () => aplicar({ search: '' }),
    },
  ].filter(Boolean);

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
      return;
    }
    onFiltersChange({
      ...filters,
      type: '',
      category: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      minAmount: '',
      maxAmount: '',
    });
  };

  return (
    <div className='card space-y-3'>
      {/* Busca: campo principal, com botão de limpar dentro. */}
      <div className='relative'>
        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-monkey-muted' />
        <input
          type='search'
          value={filters.search}
          onChange={(e) => aplicar({ search: e.target.value })}
          placeholder='Buscar por descrição ou categoria...'
          aria-label='Buscar transações'
          className='input-field pl-9 pr-9'
          disabled={loading}
        />
        {filters.search && (
          <button
            type='button'
            onClick={() => aplicar({ search: '' })}
            aria-label='Limpar busca'
            className='absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-monkey-muted hover:bg-monkey-muted/10 hover:text-monkey-text'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>

      {/* Tipo: o filtro mais usado, em destaque logo abaixo da busca. */}
      <Segmented
        ariaLabel='Tipo'
        value={filters.type}
        onChange={(type) => aplicar({ type })}
        options={[
          { value: '', label: 'Todos' },
          { value: 'income', label: 'Receitas' },
          { value: 'expense', label: 'Despesas' },
        ]}
      />

      {/* Categoria: select nativo (a lista pode ser longa) com ícone. */}
      <div className='relative'>
        <Tag className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-monkey-muted' />
        <select
          value={filters.category}
          onChange={(e) => aplicar({ category: e.target.value })}
          aria-label='Categoria'
          className='input-field appearance-none pl-9 pr-8 text-sm'
          disabled={loading}
        >
          <option value=''>Todas as categorias</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-monkey-muted' />
      </div>

      {/* Avançado: período, faixa de valor e ordenação. */}
      <button
        type='button'
        onClick={() => setShowAdvanced((v) => !v)}
        aria-expanded={showAdvanced}
        className='flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-xs font-medium text-monkey-muted transition-colors hover:text-monkey-text'
      >
        <span className='flex items-center gap-1.5'>
          <SlidersHorizontal className='h-3.5 w-3.5' />
          Período, valor e ordenação
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className='overflow-hidden'
          >
            <div className='space-y-3 border-t border-monkey-muted/20 pt-3'>
              <div className='grid grid-cols-2 gap-2'>
                <LabeledField label='De' icon={Calendar}>
                  <input
                    type='date'
                    value={filters.dateFrom}
                    onChange={(e) => aplicar({ dateFrom: e.target.value })}
                    className='input-field px-2 py-1.5 text-sm'
                    max={
                      filters.dateTo || new Date().toISOString().split('T')[0]
                    }
                    disabled={loading}
                  />
                </LabeledField>
                <LabeledField label='Até' icon={Calendar}>
                  <input
                    type='date'
                    value={filters.dateTo}
                    onChange={(e) => aplicar({ dateTo: e.target.value })}
                    className='input-field px-2 py-1.5 text-sm'
                    min={filters.dateFrom}
                    max={new Date().toISOString().split('T')[0]}
                    disabled={loading}
                  />
                </LabeledField>
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <LabeledField
                  label={`Mín (${currencyInfo(currency).symbol})`}
                  icon={Coins}
                >
                  <input
                    type='number'
                    step='0.01'
                    min='0'
                    value={filters.minAmount || ''}
                    onChange={(e) => aplicar({ minAmount: e.target.value })}
                    className='input-field px-2 py-1.5 text-sm'
                    placeholder='0,00'
                    disabled={loading}
                  />
                </LabeledField>
                <LabeledField
                  label={`Máx (${currencyInfo(currency).symbol})`}
                  icon={Coins}
                >
                  <input
                    type='number'
                    step='0.01'
                    min='0'
                    value={filters.maxAmount || ''}
                    onChange={(e) => aplicar({ maxAmount: e.target.value })}
                    className='input-field px-2 py-1.5 text-sm'
                    placeholder='0,00'
                    disabled={loading}
                  />
                </LabeledField>
              </div>

              <LabeledField label='Ordenar por' icon={ArrowUpDown}>
                <select
                  value={filters.sortBy}
                  onChange={(e) => aplicar({ sortBy: e.target.value })}
                  className='input-field px-2 py-1.5 text-sm'
                  disabled={loading}
                >
                  <option value='date_desc'>Data (mais recente)</option>
                  <option value='date_asc'>Data (mais antiga)</option>
                  <option value='amount_desc'>Valor (maior)</option>
                  <option value='amount_asc'>Valor (menor)</option>
                  <option value='category'>Categoria</option>
                </select>
              </LabeledField>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chips dos filtros ativos + limpar tudo. */}
      <AnimatePresence initial={false}>
        {chips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className='overflow-hidden'
          >
            <div className='flex flex-wrap items-center gap-1.5 border-t border-monkey-muted/20 pt-3'>
              {chips.map((chip) => (
                <motion.button
                  key={chip.key}
                  type='button'
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={chip.onRemove}
                  title='Remover este filtro'
                  className='flex items-center gap-1 rounded-full bg-monkey-primary/15 py-1 pl-2.5 pr-1.5 text-xs font-medium text-monkey-primary transition-colors hover:bg-monkey-primary/25'
                >
                  {chip.label}
                  <X className='h-3 w-3' />
                </motion.button>
              ))}
              <button
                type='button'
                onClick={handleClearFilters}
                className='ml-auto rounded-full px-2 py-1 text-xs font-medium text-monkey-muted transition-colors hover:text-monkey-danger'
              >
                Limpar tudo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
