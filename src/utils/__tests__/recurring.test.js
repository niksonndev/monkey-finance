import { describe, it, expect } from 'vitest';
import { ocorrenciasVencidas } from '../recurring';

const hoje = new Date(2026, 2, 15); // 15/03/2026, fuso local

describe('ocorrenciasVencidas', () => {
  it('não gera nada quando a próxima data ainda está no futuro', () => {
    const r = ocorrenciasVencidas(
      { next_date: '2026-04-10', frequency: 'monthly' },
      hoje,
    );
    expect(r.vencidas).toEqual([]);
    expect(r.proxima).toBe('2026-04-10');
  });

  it('gera a ocorrência que vence exatamente hoje', () => {
    const r = ocorrenciasVencidas(
      { next_date: '2026-03-15', frequency: 'monthly' },
      hoje,
    );
    expect(r.vencidas).toEqual(['2026-03-15']);
    expect(r.proxima).toBe('2026-04-15');
  });

  it('gera todas as mensalidades atrasadas e aponta a próxima', () => {
    const r = ocorrenciasVencidas(
      { next_date: '2025-12-20', frequency: 'monthly' },
      hoje,
    );
    expect(r.vencidas).toEqual(['2025-12-20', '2026-01-20', '2026-02-20']);
    expect(r.proxima).toBe('2026-03-20');
  });

  it('gera as semanas atrasadas', () => {
    const r = ocorrenciasVencidas(
      { next_date: '2026-03-01', frequency: 'weekly' },
      hoje,
    );
    expect(r.vencidas).toEqual(['2026-03-01', '2026-03-08', '2026-03-15']);
    expect(r.proxima).toBe('2026-03-22');
  });

  it('não derrapa o dia do mês ao atravessar fevereiro', () => {
    // A âncora é sempre 31/01: date-fns faz o clamp em fevereiro (28/02) e o
    // mês seguinte volta para 31. Sem a âncora, viraria 28/02 → 28/03.
    const r = ocorrenciasVencidas(
      { next_date: '2026-01-31', frequency: 'monthly' },
      new Date(2026, 3, 30), // 30/04/2026
    );
    expect(r.vencidas).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
    expect(r.proxima).toBe('2026-05-31');
  });

  it('tolera next_date inválido sem quebrar', () => {
    expect(
      ocorrenciasVencidas({ next_date: null, frequency: 'monthly' }, hoje),
    ).toEqual({ vencidas: [], proxima: null });
    expect(
      ocorrenciasVencidas({ next_date: 'ontem', frequency: 'monthly' }, hoje),
    ).toEqual({ vencidas: [], proxima: null });
  });

  it('respeita o teto de segurança em dado absurdo', () => {
    const r = ocorrenciasVencidas(
      { next_date: '1900-01-01', frequency: 'weekly' },
      hoje,
    );
    expect(r.vencidas).toHaveLength(600);
    expect(r.vencidas[0]).toBe('1900-01-01');
    expect(r.proxima).toBeNull(); // teto atingido: continua na próxima execução
  });
});
