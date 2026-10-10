import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransactions } from '../hooks/useTransactions';
import DashboardCards from '../components/DashboardCards';
import PieChart from '../components/PieChart';
import TransactionList from '../components/TransactionList';
import TransactionModal from '../components/TransactionModal';
import Filters from '../components/Filters';
import MonthNavigator from '../components/MonthNavigator';
import { parseLocalDate } from '../utils/formatters';
import { filterAndSortTransactions } from '../utils/transactionFilters';

export default function Dashboard() {
  const {
    transactions,
    loading,
    getSummary,
    getCategorySummary,
    refetch,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    sortBy: 'date_desc',
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthlyTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const date = parseLocalDate(t.date);
      return date >= monthStart && date <= monthEnd;
    });
  }, [transactions, monthStart, monthEnd]);

  const filteredTransactions = useMemo(
    () => filterAndSortTransactions(monthlyTransactions, filters),
    [monthlyTransactions, filters],
  );

  // Cards e gráficos usam o mês inteiro, não o resultado do filtro: filtrar a
  // lista não deve mexer no saldo do mês nem no tamanho dos gráficos (o que
  // antes deslocava a página quando um filtro era aplicado).
  const stats = useMemo(() => {
    const summary = getSummary(monthlyTransactions);
    const incomeCategories = getCategorySummary('income', monthlyTransactions);
    const expenseCategories = getCategorySummary(
      'expense',
      monthlyTransactions,
    );

    return {
      ...summary,
      incomeCategories,
      expenseCategories,
    };
  }, [monthlyTransactions, getSummary, getCategorySummary]);

  const handleOpenModal = (transaction = null) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTransaction(null);
  };

  const handleSuccess = () => {
    handleCloseModal();
    refetch();
  };

  const handleSave = async (transactionData) => {
    if (editingTransaction) {
      return updateTransaction(editingTransaction.id, transactionData);
    }
    return addTransaction(transactionData);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      const { error } = await deleteTransaction(id);
      if (error) console.error('Erro ao excluir transação:', error);
      refetch();
    }
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToCurrentMonth = () => setCurrentMonth(new Date());

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-monkey-text'>Dashboard</h1>
          <p className='text-monkey-muted text-sm'>
            Visão geral do mês de{' '}
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>

        <MonthNavigator
          onPrev={prevMonth}
          onNext={nextMonth}
          onCurrent={goToCurrentMonth}
          actions={
            <button
              onClick={() => handleOpenModal()}
              className='btn-primary ml-auto flex items-center gap-2'
            >
              <Plus className='w-4 h-4' />
              <span className='hidden sm:inline'>Nova transação</span>
              <span className='sm:hidden'>Nova</span>
            </button>
          }
        />
      </div>

      <DashboardCards stats={stats} />

      {/* Layout principal: flexbox responsivo */}
      <div className='flex flex-col lg:flex-row gap-6'>
        {/* Coluna esquerda: Lista de transações (ocupa espaço restante) */}
        <div className='flex-1 min-w-0 lg:pr-0'>
          <div className='card'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-semibold text-monkey-text'>
                Transações do mês
              </h2>
              <span className='text-sm text-monkey-muted'>
                {filteredTransactions.length}{' '}
                {filteredTransactions.length === 1 ? 'transação' : 'transações'}
              </span>
            </div>
            <TransactionList
              transactions={filteredTransactions}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              loading={loading}
            />
          </div>
        </div>

        {/* Coluna direita: filtros e gráficos */}
        <aside className='w-full lg:w-80 flex-shrink-0 flex flex-col gap-6'>
          <Filters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={() =>
              setFilters({
                type: '',
                category: '',
                dateFrom: '',
                dateTo: '',
                search: '',
                sortBy: 'date_desc',
              })
            }
            transactions={monthlyTransactions}
            loading={loading}
          />

          <PieChart
            data={Object.values(stats.expenseCategories)}
            labels={Object.keys(stats.expenseCategories)}
            title='Despesas por categoria'
            emptyMessage='Nenhuma despesa neste mês'
          />

          <PieChart
            data={Object.values(stats.incomeCategories)}
            labels={Object.keys(stats.incomeCategories)}
            title='Receitas por categoria'
            emptyMessage='Nenhuma receita neste mês'
          />
        </aside>
      </div>

      {/* `key` força a remontagem a cada transação: o formulário do modal
          nasce já preenchido (ou vazio), em vez de copiar props num efeito. */}
      <TransactionModal
        key={editingTransaction?.id ?? 'nova'}
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        onSave={handleSave}
        transaction={editingTransaction}
      />
    </div>
  );
}
