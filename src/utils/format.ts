import { format as dateFnsFormat } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(
  timestamp: number,
  formatStr: string = 'dd/MM/yyyy'
): string {
  return dateFnsFormat(new Date(timestamp), formatStr, { locale: ptBR });
}

export function formatDateTime(timestamp: number): string {
  return dateFnsFormat(new Date(timestamp), 'dd/MM/yyyy HH:mm', {
    locale: ptBR,
  });
}

export function formatCPFCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 11) {
    // CPF: 000.000.000-00
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else {
    // CNPJ: 00.000.000/0000-00
    return numbers.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    );
  }
}

export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 10) {
    // (00) 0000-0000
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else {
    // (00) 00000-0000
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
}

export function formatBarcode(value: string): string {
  return value.replace(/\D/g, '');
}
