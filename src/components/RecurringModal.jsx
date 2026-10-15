import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Loader2,
  ChevronDown,
  CalendarDays,
  Repeat,
} from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '../constants/categories';
import { currencyInfo } from '../constants/currencies';
import { useCurrency } from '../context/CurrencyContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useEscapeKey } from '../hooks/useEscapeKey';

/**
 * Edição de uma recorrência (a regra, não os lançamentos que ela já gerou):
 * valor, categoria, descrição, frequência e a próxima data.
 *
 * Antes só existia "Encerrar": para corrigir um valor errado era preciso
 * encerrar a regra e criar outra no modal de lançamento. O tipo e a moeda ficam
 * de fora de propósito, trocar o sentido de uma regra em andamento misturaria
 * histórico de receita com despesa.
 */
export default function RecurringModal({
  isOpen,
  recorrencia,
  onClose,
  onSave,
  onSuccess,
}) {
  const { currency } = useCurrency();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(() => ({
    amount: recorrencia?.amount ?? '',
    category: recorrencia?.category || '',
    description: recorrencia?.description || '',
    frequency: recorrencia?.frequency || 'monthly',
    next_date: recorrencia?.next_date?.slice(0, 10) || '',
  }));

  useBodyScrollLock(isOpen);
  useEscapeKey(isOpen, onClose);

  const categorias = CATEGORIES[recorrencia?.type] || [];
  const categoriaForaDaLista =
    formData.category && !categorias.includes(formData.category)
      ? formData.category
      : null;

  const label =
    'mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-monkey-muted';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const novosErros = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      novosErros.amount = 'Informe um valor maior que zero';
    }
    if (!formData.category) novosErros.category = 'Selecione uma categoria';
    if (!formData.next_date) novosErros.next_date = 'Escolha a próxima data';

    setErrors(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setLoading(true);
    try {
      const { error } = await onSave({
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        frequency: formData.frequency,
        next_date: formData.next_date,
      });
      if (error) throw error;
      onSuccess?.();
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center sm:items-center'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            onClick={onClose}
          />

          <motion.div
            role='dialog'
            aria-modal='true'
            aria-labelledby='recurring-modal-title'
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: 40,
              scale: 0.98,
              transition: { duration: 0.18 },
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className='relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-monkey-muted/30 bg-monkey-card sm:mx-4 sm:max-w-md sm:rounded-2xl'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b border-monkey-muted/30 px-4 py-3.5 sm:px-5'>
              <h2
                id='recurring-modal-title'
                className='text-lg font-bold text-monkey-text'
              >
                Editar recorrência
              </h2>
              <button
                type='button'
                onClick={onClose}
                aria-label='Fechar'
                className='rounded-lg p-1.5 text-monkey-muted transition-colors hover:bg-monkey-muted/10 hover:text-monkey-text'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <form
              id='form-recorrencia'
              onSubmit={handleSubmit}
              className='flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5'
            >
              {errors.submit && (
                <p className='rounded-lg bg-monkey-danger/10 p-2.5 text-sm text-monkey-danger'>
                  {errors.submit}
                </p>
              )}

              <p className='flex items-start gap-2 rounded-xl border border-monkey-muted/20 bg-monkey-bg p-3 text-xs text-monkey-muted'>
                <Repeat className='mt-0.5 h-4 w-4 flex-shrink-0 text-monkey-primary' />
                <span>
                  Vale para os próximos lançamentos. Os que já foram criados
                  continuam como estão.
                </span>
              </p>

              <div>
                <label htmlFor='rec-amount' className={label}>
                  Valor
                </label>
                <div className='relative'>
                  <span
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      recorrencia?.type === 'income'
                        ? 'text-monkey-success'
                        : 'text-monkey-danger'
                    }`}
                  >
                    {recorrencia?.type === 'income' ? '+' : '−'}
                    {currencyInfo(currency).symbol}
                  </span>
                  <input
                    id='rec-amount'
                    name='amount'
                    type='number'
                    inputMode='decimal'
                    step='0.01'
                    min='0.01'
                    value={formData.amount}
                    onChange={handleChange}
                    className={`input-field py-3 pl-20 text-lg font-semibold tabular-nums ${
                      errors.amount ? 'border-monkey-danger' : ''
                    }`}
                  />
                </div>
                {errors.amount && (
                  <p className='mt-1 text-xs text-monkey-danger'>
                    {errors.amount}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor='rec-category' className={label}>
                  Categoria
                </label>
                <div className='relative'>
                  <select
                    id='rec-category'
                    name='category'
                    value={formData.category}
                    onChange={handleChange}
                    className={`input-field appearance-none pr-9 ${
                      errors.category ? 'border-monkey-danger' : ''
                    }`}
                  >
                    <option value=''>Selecione uma categoria</option>
                    {categoriaForaDaLista && (
                      <option value={categoriaForaDaLista}>
                        {categoriaForaDaLista}
                      </option>
                    )}
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-monkey-muted' />
                </div>
                {errors.category && (
                  <p className='mt-1 text-xs text-monkey-danger'>
                    {errors.category}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor='rec-description' className={label}>
                  Descrição <span className='normal-case'>(opcional)</span>
                </label>
                <input
                  id='rec-description'
                  name='description'
                  type='text'
                  value={formData.description}
                  onChange={handleChange}
                  className='input-field'
                  placeholder='Ex: Streaming'
                />
              </div>

              <div>
                <span className={label}>Repetição</span>
                <div className='flex gap-1.5'>
                  {[
                    { value: 'monthly', label: 'Todo mês' },
                    { value: 'weekly', label: 'Toda semana' },
                  ].map((freq) => (
                    <button
                      key={freq.value}
                      type='button'
                      aria-pressed={formData.frequency === freq.value}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          frequency: freq.value,
                        }))
                      }
                      className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                        formData.frequency === freq.value
                          ? 'bg-monkey-primary/20 text-monkey-primary ring-1 ring-monkey-primary/40'
                          : 'bg-monkey-muted/10 text-monkey-muted hover:bg-monkey-muted/20'
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor='rec-next-date' className={label}>
                  <CalendarDays className='h-3.5 w-3.5' />
                  Próximo lançamento
                </label>
                <input
                  id='rec-next-date'
                  name='next_date'
                  type='date'
                  value={formData.next_date}
                  onChange={handleChange}
                  className={`input-field ${
                    errors.next_date ? 'border-monkey-danger' : ''
                  }`}
                />
                {errors.next_date && (
                  <p className='mt-1 text-xs text-monkey-danger'>
                    {errors.next_date}
                  </p>
                )}
              </div>
            </form>

            <div className='flex gap-2 border-t border-monkey-muted/30 bg-monkey-card px-4 py-3.5 sm:px-5'>
              <button
                type='button'
                onClick={onClose}
                className='btn-secondary flex-1'
              >
                Cancelar
              </button>
              <button
                type='submit'
                form='form-recorrencia'
                disabled={loading}
                className='btn-primary flex flex-1 items-center justify-center gap-2 disabled:opacity-60'
              >
                {loading ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4' />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
