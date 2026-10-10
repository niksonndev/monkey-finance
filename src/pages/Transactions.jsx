import { useState, useMemo } from 'react';
import { Plus, Download } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransactions } from '../hooks/useTransactions';
import TransactionList from '../components/TransactionList';
import TransactionModal from '../components/TransactionModal';
import Filters from '../components/Filters';
import MonthNavigator from '../components/MonthNavigator';
import { parseLocalDate } from '../utils/formatters';
import { filterAndSortTransactions } from '../utils/transactionFilters';

export default function Transactions() {
  const {
    transactions,
    loading,
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
    minAmount: '',
    maxAmount: '',
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

  // Escapa campos para CSV: aspas duplas, separadores e quebras de linha
  const escapeCsvField = (value) => {
    const str = String(value ?? '');
    return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'];
    const rows = filteredTransactions.map((t) => [
      format(parseLocalDate(t.date), 'dd/MM/yyyy', { locale: ptBR }),
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.category || '',
      t.description || '',
      Number(t.amount).toFixed(2).replace('.', ','),
    ]);
    // BOM (\uFEFF) para Excel reconhecer UTF-8; ';' como separador (padrão pt-BR)
    const csv =
      '\uFEFF' +
      [headers, ...rows].map((r) => r.map(escapeCsvField).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes-${format(currentMonth, 'yyyy-MM', { locale: ptBR })}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className='space-y-5 sm:space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-monkey-text'>Transações</h1>
          <p className='text-monkey-muted text-sm'>
            Gerencie suas transações do mês de{' '}
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
        </div>
        <MonthNavigator
          onPrev={prevMonth}
          onNext={nextMonth}
          onCurrent={goToCurrentMonth}
          actions={
            <>
              <button
                onClick={exportToCSV}
                className='btn-secondary flex items-center gap-2'
              >
                <Download className='w-4 h-4' />
                Exportar CSV
              </button>
              <button
                onClick={() => handleOpenModal()}
                className='btn-primary flex items-center gap-2'
              >
                <Plus className='w-4 h-4' />
                Nova transação
              </button>
            </>
          }
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <div className='card'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-semibold text-monkey-text'>
                Todas as transações
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

        <div>
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
                minAmount: '',
                maxAmount: '',
              })
            }
            transactions={monthlyTransactions}
            loading={loading}
          />
        </div>
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
