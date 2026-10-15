import { parseLocalDate } from './formatters';

/**
 * Filtros e ordenação compartilhados entre Dashboard e Transações.
 * Sempre retorna uma nova lista (não muta a original).
 */
export function filterAndSortTransactions(transactions, filters) {
  let result = [...transactions];

  if (filters.type) {
    result = result.filter((t) => t.type === filters.type);
  }
  if (filters.category) {
    result = result.filter((t) => t.category === filters.category);
  }
  if (filters.dateFrom) {
    result = result.filter(
      (t) => parseLocalDate(t.date) >= parseLocalDate(filters.dateFrom),
    );
  }
  if (filters.dateTo) {
    result = result.filter(
      (t) => parseLocalDate(t.date) <= parseLocalDate(filters.dateTo),
    );
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.description?.toLowerCase().includes(search) ||
        t.category?.toLowerCase().includes(search),
    );
  }
  if (filters.minAmount) {
    result = result.filter(
      (t) => Number(t.amount) >= parseFloat(filters.minAmount),
    );
  }
  if (filters.maxAmount) {
    result = result.filter(
      (t) => Number(t.amount) <= parseFloat(filters.maxAmount),
    );
  }

  switch (filters.sortBy) {
    case 'date_asc':
      result.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
      break;
    case 'amount_desc':
      result.sort((a, b) => Number(b.amount) - Number(a.amount));
      break;
    case 'amount_asc':
      result.sort((a, b) => Number(a.amount) - Number(b.amount));
      break;
    case 'category':
      result.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
      break;
    default:
      result.sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  }

  return result;
}
