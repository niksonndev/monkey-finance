import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Repeat, CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { addDays, addMonths, addWeeks, format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { CATEGORIES } from '../constants/categories';
import { parseLocalDate } from '../utils/formatters';
import { currencyInfo } from '../constants/currencies';

/** Atalhos de data: hoje é o padrão, os outros poupam o seletor nativo. */
const ATALHOS_DATA = [
  { label: 'Hoje', dias: 0 },
  { label: 'Ontem', dias: -1 },
  { label: 'Anteontem', dias: -2 },
];

export default function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  onSave,
  transaction = null,
}) {
  const { user } = useAuth();
  // A moeda é do app (Configurações → Moeda), não desta tela: só o símbolo
  // aparece dentro do campo de valor, para dar contexto ao número.
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const hoje = new Date().toISOString().split('T')[0];
  const formVazio = {
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: hoje,
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
          date: transaction.date?.split('T')[0] || hoje,
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

  const ehReceita = formData.type === 'income';

  const validateForm = () => {
    const newErrors = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Informe um valor maior que zero';
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

  const label =
    'mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-monkey-muted';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center sm:items-center'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            onClick={onClose}
          />

          {/* No celular sobe como folha (mais fácil de alcançar com o dedo);
              no desktop continua modal centralizado. */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className='relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-monkey-muted/30 bg-monkey-card sm:mx-4 sm:max-w-md sm:rounded-2xl'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b border-monkey-muted/30 px-4 py-3.5 sm:px-5'>
              <h2 className='text-lg font-bold text-monkey-text'>
                {transaction ? 'Editar transação' : 'Nova transação'}
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
              onSubmit={handleSubmit}
              className='flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5'
            >
              {errors.submit && (
                <p className='rounded-lg bg-monkey-danger/10 p-2.5 text-sm text-monkey-danger'>
                  {errors.submit}
                </p>
              )}

              {/* Tipo: pílulas com a cor do sentido (verde receita, vermelho
                  despesa), que é a primeira decisão de quem lança. */}
              <div>
                <span className={label}>Tipo</span>
                <div
                  role='group'
                  aria-label='Tipo da transação'
                  className='flex gap-2'
                >
                  {['expense', 'income'].map((type) => {
                    const ativo = formData.type === type;
                    const receita = type === 'income';
                    return (
                      <button
                        key={type}
                        type='button'
                        aria-pressed={ativo}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, type }))
                        }
                        className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                          ativo
                            ? receita
                              ? 'bg-monkey-success/20 text-monkey-success ring-1 ring-monkey-success/40'
                              : 'bg-monkey-danger/20 text-monkey-danger ring-1 ring-monkey-danger/40'
                            : 'bg-monkey-muted/10 text-monkey-muted hover:bg-monkey-muted/20'
                        }`}
                      >
                        {receita ? 'Receita' : 'Despesa'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Valor: o campo maior do formulário, com o símbolo da moeda
                  dentro (a moeda em si se troca em Configurações). */}
              <div>
                <label htmlFor='amount' className={label}>
                  Valor
                </label>
                <div className='relative'>
                  <span
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${
                      ehReceita ? 'text-monkey-success' : 'text-monkey-danger'
                    }`}
                  >
                    {ehReceita ? '+' : '−'}
                    {currencyInfo(currency).symbol}
                  </span>
                  <input
                    id='amount'
                    name='amount'
                    type='number'
                    inputMode='decimal'
                    step='0.01'
                    min='0.01'
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder='0,00'
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

              {/* Categoria */}
              <div>
                <label htmlFor='category' className={label}>
                  Categoria
                </label>
                <div className='relative'>
                  <select
                    id='category'
                    name='category'
                    value={formData.category}
                    onChange={handleChange}
                    className={`input-field appearance-none pr-9 ${
                      errors.category ? 'border-monkey-danger' : ''
                    }`}
                  >
                    <option value=''>Selecione uma categoria</option>
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

              {/* Descrição */}
              <div>
                <label htmlFor='description' className={label}>
                  Descrição <span className='normal-case'>(opcional)</span>
                </label>
                <input
                  id='description'
                  name='description'
                  type='text'
                  value={formData.description}
                  onChange={handleChange}
                  className='input-field'
                  placeholder='Ex: Mercado da esquina'
                />
              </div>

              {/* Data: atalhos para os casos comuns, seletor para o resto. */}
              <div>
                <label htmlFor='date' className={label}>
                  <CalendarDays className='h-3.5 w-3.5' />
                  Data
                </label>
                <div className='flex gap-1.5'>
                  {ATALHOS_DATA.map((atalho) => {
                    const valor = format(addDays(new Date(), atalho.dias), 'yyyy-MM-dd');
                    const ativo = formData.date === valor;
                    return (
                      <button
                        key={atalho.label}
                        type='button'
                        aria-pressed={ativo}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, date: valor }))
                        }
                        className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                          ativo
                            ? 'bg-monkey-primary/20 text-monkey-primary ring-1 ring-monkey-primary/40'
                            : 'bg-monkey-muted/10 text-monkey-muted hover:bg-monkey-muted/20'
                        }`}
                      >
                        {atalho.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  id='date'
                  name='date'
                  type='date'
                  value={formData.date}
                  onChange={handleChange}
                  className={`input-field mt-1.5 ${
                    errors.date ? 'border-monkey-danger' : ''
                  }`}
                />
                {errors.date && (
                  <p className='mt-1 text-xs text-monkey-danger'>
                    {errors.date}
                  </p>
                )}
              </div>

              {/* Recorrência: só se cria no cadastro. Ao editar, a transação
                  não tem vínculo com a regra, então marcarmos aqui não criaria
                  nada — em vez de um no-op silencioso, explicamos onde gerir. */}
              {transaction ? (
                transaction.is_recurring && (
                  <p className='rounded-xl border border-monkey-muted/20 bg-monkey-bg p-3 text-xs text-monkey-muted'>
                    Esta transação é recorrente. As repetições são lançadas ao
                    abrir o app e podem ser encerradas em Configurações →
                    Recorrências.
                  </p>
                )
              ) : (
                <div className='rounded-xl border border-monkey-muted/20 bg-monkey-bg p-3'>
                  <div className='flex items-center gap-3'>
                    <span className='flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-monkey-primary/15 text-monkey-primary'>
                      <Repeat className='h-4 w-4' />
                    </span>
                    <label
                      htmlFor='is_recurring'
                      className='flex-1 cursor-pointer'
                    >
                      <span className='block text-sm font-medium text-monkey-text'>
                        Repetir automaticamente
                      </span>
                      <span className='block text-xs text-monkey-muted'>
                        Cria os próximos lançamentos sozinho
                      </span>
                    </label>
                    {/* Switch no lugar do checkbox: estado ligado/desligado
                        fica óbvio de longe. */}
                    <button
                      type='button'
                      id='is_recurring'
                      role='switch'
                      aria-checked={formData.is_recurring}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          is_recurring: !prev.is_recurring,
                        }))
                      }
                      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                        formData.is_recurring
                          ? 'bg-monkey-primary'
                          : 'bg-monkey-muted/30'
                      }`}
                    >
                      <motion.span
                        layout
                        transition={{
                          type: 'spring',
                          damping: 26,
                          stiffness: 340,
                        }}
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${
                          formData.is_recurring ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {formData.is_recurring && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className='overflow-hidden'
                      >
                        <div className='flex gap-1.5 pt-3'>
                          {[
                            { value: 'monthly', label: 'Todo mês' },
                            { value: 'weekly', label: 'Toda semana' },
                          ].map((freq) => (
                            <button
                              key={freq.value}
                              type='button'
                              aria-pressed={
                                formData.recurring_frequency === freq.value
                              }
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  recurring_frequency: freq.value,
                                }))
                              }
                              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                                formData.recurring_frequency === freq.value
                                  ? 'bg-monkey-primary/20 text-monkey-primary ring-1 ring-monkey-primary/40'
                                  : 'bg-monkey-muted/10 text-monkey-muted hover:bg-monkey-muted/20'
                              }`}
                            >
                              {freq.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </form>

            {/* Rodapé fixo: os botões não rolam junto com o formulário. */}
            <div className='flex gap-2 border-t border-monkey-muted/30 bg-monkey-card px-4 py-3.5 sm:px-5'>
              <button
                type='button'
                onClick={onClose}
                className='btn-secondary flex-1'
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type='submit'
                disabled={loading}
                onClick={handleSubmit}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold text-monkey-bg transition-colors disabled:opacity-60 ${
                  ehReceita
                    ? 'bg-monkey-success hover:brightness-110'
                    : 'bg-monkey-primary hover:brightness-110'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4' />
                    {transaction ? 'Atualizar' : 'Salvar'}
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
