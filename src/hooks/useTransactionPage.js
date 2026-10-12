import { useCallback, useMemo, useState } from 'react';
import { addMonths, endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { useTransactions } from './useTransactions';
import { parseLocalDate } from '../utils/formatters';
import { filterAndSortTransactions } from '../utils/transactionFilters';

/**
 * Estado e ações que o Dashboard e a tela de Transações compartilham: o mês em
 * exibição, os filtros, a lista do mês (e a lista filtrada) e o ciclo do modal
 * de lançamento (abrir, salvar, excluir).
 *
 * As duas telas eram praticamente o mesmo arquivo: mudar o comportamento da
 * lista exigia mudar nos dois, e era fácil esquecer um. O que é próprio de cada
 * tela (cards e gráficos no Dashboard, exportar planilha em Transações) ficou
 * em cada página.
 */

/** Filtros no estado inicial: sem nenhum filtro aplicado, mais recentes antes. */
export function filtrosVazios() {
  return {
    type: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'date_desc',
  };
}

export function useTransactionPage() {
  const {
    transactions,
    loading,
    carregandoInicial,
    error,
    refetch,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getSummary,
    getCategorySummary,
  } = useTransactions();

  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filters, setFilters] = useState(filtrosVazios);

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

  const limparFiltros = useCallback(() => setFilters(filtrosVazios()), []);

  const abrirModal = useCallback((transaction = null) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  }, []);

  const fecharModal = useCallback(() => {
    setShowModal(false);
    setEditingTransaction(null);
  }, []);

  const handleSuccess = useCallback(() => {
    fecharModal();
    refetch();
  }, [fecharModal, refetch]);

  const handleSave = useCallback(
    (transactionData) =>
      editingTransaction
        ? updateTransaction(editingTransaction.id, transactionData)
        : addTransaction(transactionData),
    [editingTransaction, updateTransaction, addTransaction],
  );

  /** Exclui sem perguntar: a confirmação é da tela (ver ConfirmDialog). */
  const excluirTransacao = useCallback(
    async (id) => {
      const { error: erro } = await deleteTransaction(id);
      if (erro) console.error('Erro ao excluir transação:', erro);
      refetch();
      return { error: erro };
    },
    [deleteTransaction, refetch],
  );

  // Exclusão pedida na lista: abre a confirmação e só exclui depois do "sim".
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const pedirExclusao = useCallback(
    (transaction) => setTransacaoParaExcluir(transaction),
    [],
  );
  const cancelarExclusao = useCallback(() => setTransacaoParaExcluir(null), []);

  const confirmarExclusao = useCallback(async () => {
    if (!transacaoParaExcluir) return;
    setExcluindo(true);
    await excluirTransacao(transacaoParaExcluir.id);
    setExcluindo(false);
    setTransacaoParaExcluir(null);
  }, [transacaoParaExcluir, excluirTransacao]);

  const prevMonth = useCallback(
    () => setCurrentMonth((mes) => subMonths(mes, 1)),
    [],
  );
  const nextMonth = useCallback(
    () => setCurrentMonth((mes) => addMonths(mes, 1)),
    [],
  );
  const goToCurrentMonth = useCallback(() => setCurrentMonth(new Date()), []);

  return {
    // dados
    transactions,
    monthlyTransactions,
    filteredTransactions,
    loading,
    carregandoInicial,
    error,
    refetch,
    getSummary,
    getCategorySummary,

    // mês
    currentMonth,
    prevMonth,
    nextMonth,
    goToCurrentMonth,

    // filtros
    filters,
    setFilters,
    limparFiltros,

    // modal de lançamento
    showModal,
    editingTransaction,
    abrirModal,
    fecharModal,
    handleSave,
    handleSuccess,
    excluirTransacao,

    // confirmação de exclusão (a tela renderiza o diálogo)
    transacaoParaExcluir,
    excluindo,
    pedirExclusao,
    cancelarExclusao,
    confirmarExclusao,
  };
}
