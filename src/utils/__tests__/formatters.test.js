import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  hojeISO,
  parseLocalDate,
} from '../formatters';

describe('formatCurrency', () => {
  it('formata valores em BRL', () => {
    // Intl usa espaço inseparável (U+00A0); normalizamos para comparar
    const formatted = formatCurrency(1234.56).replace(/\u00A0/g, ' ');
    expect(formatted).toBe('R$ 1.234,56');
  });

  it('retorna R$ 0,00 para null/undefined', () => {
    const formatted = formatCurrency(null).replace(/\u00A0/g, ' ');
    expect(formatted).toBe('R$ 0,00');
    expect(formatCurrency(undefined).replace(/\u00A0/g, ' ')).toBe('R$ 0,00');
  });

  it('respeita a moeda do app', () => {
    expect(formatCurrency(50, 'EUR').replace(/\u00A0/g, ' ')).toBe('€ 50,00');
    // Em pt-BR o dólar é escrito como US$
    expect(formatCurrency(50, 'USD').replace(/\u00A0/g, ' ')).toBe('US$ 50,00');
  });

  it('não quebra com valor inválido nem com amount em string', () => {
    // numeric do Postgres pode chegar como string
    expect(formatCurrency('1234.56', 'BRL').replace(/\u00A0/g, ' ')).toBe(
      'R$ 1.234,56',
    );
    expect(formatCurrency('abc', 'BRL').replace(/\u00A0/g, ' ')).toBe(
      'R$ 0,00',
    );
  });
});

describe('formatDate', () => {
  it('formata data no padrão dd/MM/yyyy', () => {
    // 'yyyy-mm-dd' deve ser tratado como data local (sem deslocamento de fuso)
    expect(formatDate('2024-05-07')).toBe('07/05/2024');
  });

  it('retorna string vazia para datas inválidas/nulas', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
  });
});

describe('parseLocalDate', () => {
  it('interpreta yyyy-mm-dd como meia-noite LOCAL (não UTC)', () => {
    const d = parseLocalDate('2024-05-07');
    // Em fusos negativos (ex.: América/Sao_Paulo), new Date('2024-05-07')
    // retornaria 06/05 21:00 local. Aqui deve preservar o dia.
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(4); // maio
    expect(d.getDate()).toBe(7);
  });

  it('aceita Date e timestamps normalmente', () => {
    const now = new Date('2024-05-07T10:30:00Z');
    expect(parseLocalDate(now).getTime()).toBe(now.getTime());
  });

  it('retorna null para entradas vazias', () => {
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate('')).toBeNull();
  });
});

describe('hojeISO', () => {
  it('usa o dia do aparelho, não o dia em UTC', () => {
    // 31/10/2026 às 23h no Brasil já é 01/11 em UTC: o valor tem de continuar
    // sendo o dia 31 (com `toISOString()` vinha 2026-11-01, e um lançamento
    // feito à noite nascia no mês seguinte).
    expect(hojeISO(new Date(2026, 9, 31, 23, 30))).toBe('2026-10-31');
    // Antes das 21h o fuso não muda nada: o valor é o mesmo nos dois jeitos.
    expect(hojeISO(new Date(2026, 9, 15, 9, 5))).toBe('2026-10-15');
  });

  it('devolve o formato das colunas date do Postgres', () => {
    expect(hojeISO(new Date(2026, 0, 7))).toBe('2026-01-07');
  });
});
