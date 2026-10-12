import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardCards from '../components/DashboardCards';
import PieChart from '../components/PieChart';
import TransactionList from '../components/TransactionList';
import TransactionModal from '../components/TransactionModal';
import Filters from '../components/Filters';
import MonthNavigator from '../components/MonthNavigator';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTransactionPage } from '../hooks/useTransactionPage';

export default function Dashboard() {
  const {
    monthlyTransactions,
    filteredTransactions,
    loading,
    carregandoInicial,
    error,
    refetch,
    getSummary,
    getCategorySummary,
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

  return (
    <div className='space-y-5 sm:space-y-6'>
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
              onClick={() => abrirModal()}
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
              onEdit={abrirModal}
              onDelete={pedirExclusao}
              loading={carregandoInicial}
              error={error}
              onRetry={refetch}
            />
          </div>
        </div>

        {/* Coluna direita: filtros e gráficos */}
        <aside className='w-full lg:w-80 flex-shrink-0 flex flex-col gap-6'>
          <Filters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={limparFiltros}
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
