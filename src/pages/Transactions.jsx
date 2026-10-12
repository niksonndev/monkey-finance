import { Plus, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionList from '../components/TransactionList';
import TransactionModal from '../components/TransactionModal';
import Filters from '../components/Filters';
import MonthNavigator from '../components/MonthNavigator';
import ConfirmDialog from '../components/ConfirmDialog';
import { parseLocalDate } from '../utils/formatters';
import { useTransactionPage } from '../hooks/useTransactionPage';

export default function Transactions() {
  const {
    monthlyTransactions,
    filteredTransactions,
    loading,
    carregandoInicial,
    error,
    refetch,
    currentMonth,
    prevMonth,
    nextMonth,
    goToCurrentMonth,
    filters,
    setFilters,
    limparFiltros,
    showModal,
    editingTransaction,
    abrirModal,
    fecharModal,
    handleSave,
    handleSuccess,
    pedirExclusao,
    transacaoParaExcluir,
    excluindo,
    cancelarExclusao,
    confirmarExclusao,
  } = useTransactionPage();

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
                <FileDown className='w-4 h-4' />
                Exportar planilha
              </button>
              <button
                onClick={() => abrirModal()}
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
              onEdit={abrirModal}
              onDelete={pedirExclusao}
              loading={carregandoInicial}
              error={error}
              onRetry={refetch}
            />
          </div>
        </div>

        <div>
          <Filters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={limparFiltros}
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
        onClose={fecharModal}
        onSuccess={handleSuccess}
        onSave={handleSave}
        transaction={editingTransaction}
      />

      <ConfirmDialog
        isOpen={Boolean(transacaoParaExcluir)}
        title='Excluir esta transação?'
        description={
          transacaoParaExcluir
            ? `${
                transacaoParaExcluir.description ||
                transacaoParaExcluir.category ||
                'Lançamento'
              } sai da sua lista. Não dá para desfazer.`
            : ''
        }
        loading={excluindo}
        onConfirm={confirmarExclusao}
        onCancel={cancelarExclusao}
      />
    </div>
  );
}
