import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { addMonths, addWeeks, format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { CATEGORIES } from '../constants/categories';
import { parseLocalDate } from '../utils/formatters';
import { currencyInfo } from '../constants/currencies';

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  onSave,
  transaction = null,
}) {
  const { user } = useAuth();
  // A moeda é do app, não da transação (ver CurrencyContext): o lançamento é
  // gravado com a moeda ativa e a troca de unidade vale para toda a interface.
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const formVazio = {
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurring_frequency: 'monthly',
  };

  /**
   * `key` no modal (ver quem renderiza) remonta este componente a cada
   * transação, então o formulário nasce já preenchido: edição carrega os dados
   * da transação, e um lançamento novo parte do padrão. Assim não existe
   * `useEffect` para copiar props em estado (que renderizaria duas vezes).
   */
  const [formData, setFormData] = useState(() =>
    transaction
      ? {
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          description: transaction.description || '',
          date:
            transaction.date?.split('T')[0] ||
            new Date().toISOString().split('T')[0],
          is_recurring: transaction.is_recurring || false,
          recurring_frequency: transaction.recurring_frequency || 'monthly',
        }
      : formVazio,
  );

  // Categorias dependem do tipo selecionado, não da transação: saem direto do
  // formData (se o tipo ainda não tem categoria escolhida, a primeira da lista
  // entra no estado antes da tela pintar).
  const categorias = CATEGORIES[formData.type] || [];
  if (!categorias.includes(formData.category) && categorias[0]) {
    setFormData((prev) => ({ ...prev, category: categorias[0] }));
  }

  const validateForm = () => {
    const newErrors = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }
    if (!formData.category) {
      newErrors.category = 'Selecione uma categoria';
    }
    if (!formData.date) {
      newErrors.date = 'Data é obrigatória';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // O user_id é adicionado pelo hook useTransactions (addTransaction/
      // updateTransaction), que também atualiza o estado da página.
      const transactionData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        currency,
        category: formData.category,
        description: formData.description,
        date: formData.date,
        is_recurring: formData.is_recurring,
        recurring_frequency: formData.is_recurring
          ? formData.recurring_frequency
          : null,
      };

      const { error } = await onSave(transactionData);
      if (error) throw error;

      // Se for recorrente, salva na tabela recurring_transactions
      if (formData.is_recurring && !transaction) {
        // parseLocalDate evita o deslocamento de um dia (yyyy-mm-dd é lido
        // como UTC pelo new Date); addMonths/addWeeks tratam o fim de mês
        // (ex.: 31/01 + 1 mês = 28/02) sem estourar para o mês seguinte.
        const baseDate = parseLocalDate(formData.date);
        const nextDate =
          formData.recurring_frequency === 'monthly'
            ? addMonths(baseDate, 1)
            : addWeeks(baseDate, 1);

        const { error: recurringError } = await supabase
          .from('recurring_transactions')
          .insert([
            {
              user_id: user.id,
              type: formData.type,
              amount: parseFloat(formData.amount),
              currency,
              category: formData.category,
              description: formData.description,
              frequency: formData.recurring_frequency,
              next_date: format(nextDate, 'yyyy-MM-dd'),
              active: true,
            },
          ]);

        // Não bloqueia o fluxo: a transação principal já foi salva. A falha
        // fica registrada para diagnóstico (a tela não lê a tabela de
        // recorrências — ver observação no relatório de revisão).
        if (recurringError) {
          console.error('Erro ao salvar transação recorrente:', recurringError);
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 bg-black/50'
            onClick={onClose}
          />

          {/* Modal Content - CENTRALIZADO */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className='fixed z-50 w-full max-w-md sm:max-w-lg mx-4 sm:mx-auto bg-monkey-card rounded-2xl border border-monkey-muted/30 overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between p-4 border-b border-monkey-muted/30'>
              <h2 className='text-xl font-bold text-monkey-text'>
                {transaction ? 'Editar Transação' : 'Nova Transação'}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className='p-1 rounded-lg text-monkey-muted hover:bg-monkey-muted/10 hover:text-monkey-text'
              >
                <X className='w-5 h-5' />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className='p-4 space-y-4'>
              {errors.submit && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='text-sm text-monkey-danger bg-monkey-danger/10 p-2 rounded-lg'
                >
                  {errors.submit}
                </motion.p>
              )}

              {/* Tipo */}
              <div>
                <label className='block text-sm font-medium text-monkey-text mb-2'>
                  Tipo
                </label>
                <div className='flex gap-2'>
                  {['income', 'expense'].map((type) => (
                    <button
                      key={type}
                      type='button'
                      onClick={() => setFormData((prev) => ({ ...prev, type }))}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        formData.type === type
                          ? type === 'income'
                            ? 'bg-monkey-success/20 text-monkey-success border border-monkey-success/30'
                            : 'bg-monkey-danger/20 text-monkey-danger border border-monkey-danger/30'
                          : 'bg-monkey-muted/10 text-monkey-muted hover:bg-monkey-muted/20'
                      }`}
                    >
                      {type === 'income' ? 'Receita' : 'Despesa'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Moeda + Valor: a moeda é global (Configurações → Moeda), então
                  aqui só mostramos qual está ativa. */}
              <div className='flex flex-col sm:flex-row gap-3'>
                <div className='w-full sm:w-24'>
                  <label className='block text-sm font-medium text-monkey-text mb-2'>
                    Moeda
                  </label>
                  <div
                    className='input-field flex items-center justify-center text-monkey-muted'
                    title={`Moeda do app: ${currencyInfo(currency).label}. Mude em Configurações → Moeda.`}
                  >
                    {currencyInfo(currency).symbol}
                  </div>
                </div>
                <div className='flex-1'>
                  <label
                    htmlFor='amount'
                    className='block text-sm font-medium text-monkey-text mb-2'
                  >
                    Valor
                  </label>
                  <input
                    id='amount'
                    name='amount'
                    type='number'
                    step='0.01'
                    min='0.01'
                    value={formData.amount}
                    onChange={handleChange}
                    className={`input-field ${errors.amount ? 'border-monkey-danger' : ''}`}
                    placeholder='0,00'
                  />
                  {errors.amount && (
                    <p className='text-sm text-monkey-danger mt-1'>
                      {errors.amount}
                    </p>
                  )}
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label
                  htmlFor='category'
                  className='block text-sm font-medium text-monkey-text mb-2'
                >
                  Categoria
                </label>
                <select
                  id='category'
                  name='category'
                  value={formData.category}
                  onChange={handleChange}
                  className={`input-field ${errors.category ? 'border-monkey-danger' : ''}`}
                >
                  <option value=''>Selecione uma categoria</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className='text-sm text-monkey-danger mt-1'>
                    {errors.category}
                  </p>
                )}
              </div>

              {/* Descrição */}
              <div>
                <label
                  htmlFor='description'
                  className='block text-sm font-medium text-monkey-text mb-2'
                >
                  Descrição (opcional)
                </label>
                <input
                  id='description'
                  name='description'
                  type='text'
                  value={formData.description}
                  onChange={handleChange}
                  className='input-field'
                  placeholder='Ex: Salário de janeiro, Mercado...'
                />
              </div>

              {/* Data */}
              <div>
                <label
                  htmlFor='date'
                  className='block text-sm font-medium text-monkey-text mb-2'
                >
                  Data
                </label>
                <input
                  id='date'
                  name='date'
                  type='date'
                  value={formData.date}
                  onChange={handleChange}
                  className={`input-field ${errors.date ? 'border-monkey-danger' : ''}`}
                />
                {errors.date && (
                  <p className='text-sm text-monkey-danger mt-1'>
                    {errors.date}
                  </p>
                )}
              </div>

              {/* Recorrência: só se cria no cadastro. Ao editar, a transação
                  não tem vínculo com a regra, então marcar aqui não criaria
                  nada — em vez de um no-op silencioso, explicamos onde gerir. */}
              {transaction ? (
                transaction.is_recurring && (
                  <p className='text-xs text-monkey-muted bg-monkey-bg rounded-lg border border-monkey-muted/20 p-3'>
                    Esta transação é recorrente. As repetições são lançadas ao
                    abrir o app e podem ser encerradas em Configurações →
                    Recorrências.
                  </p>
                )
              ) : (
                <div className='flex items-center gap-3 p-3 bg-monkey-bg rounded-lg border border-monkey-muted/20'>
                  <input
                    id='is_recurring'
                    name='is_recurring'
                    type='checkbox'
                    checked={formData.is_recurring}
                    onChange={handleChange}
                    className='w-4 h-4 rounded border-monkey-muted bg-monkey-card text-monkey-primary focus:ring-monkey-primary'
                  />
                  <div className='flex-1'>
                    <label
                      htmlFor='is_recurring'
                      className='text-sm font-medium text-monkey-text cursor-pointer'
                    >
                      Transação recorrente
                    </label>
                    <p className='text-xs text-monkey-muted'>
                      Repetir automaticamente
                    </p>
                  </div>
                  {formData.is_recurring && (
                    <select
                      name='recurring_frequency'
                      value={formData.recurring_frequency}
                      onChange={handleChange}
                      className='input-field w-32 text-sm py-1'
                    >
                      <option value='monthly'>Mensal</option>
                      <option value='weekly'>Semanal</option>
                    </select>
                  )}
                </div>
              )}

              {/* Botões */}
              <div className='flex gap-3 pt-2'>
                <button
                  type='button'
                  onClick={onClose}
                  className='flex-1 btn-secondary'
                >
                  Cancelar
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type='submit'
                  disabled={loading}
                  className='flex-1 btn-primary flex items-center justify-center gap-2'
                >
                  {loading ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className='w-4 h-4' />
                      {transaction ? 'Atualizar' : 'Salvar'}
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
