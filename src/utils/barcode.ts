/**
 * Calcula o dígito verificador de um EAN
 * @param digits - String com os dígitos (12 para EAN-13, 7 para EAN-8)
 * @param isEAN13 - Se true, usa padrão EAN-13, senão EAN-8
 */
function calculateEANCheckDigit(digits: string, isEAN13: boolean): number {
  let sum = 0;

  for (let i = 0; i < digits.length; i++) {
    const digit = parseInt(digits[i], 10);
    let multiplier: number;

    if (isEAN13) {
      // EAN-13: multiplica por 1, 3, 1, 3... (começa com 1)
      multiplier = i % 2 === 0 ? 1 : 3;
    } else {
      // EAN-8: multiplica por 3, 1, 3, 1... (começa com 3)
      multiplier = i % 2 === 0 ? 3 : 1;
    }

    sum += digit * multiplier;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Valida um código EAN-13 ou EAN-8
 */
export function validateEAN(barcode: string): {
  isValid: boolean;
  type: 'EAN-13' | 'EAN-8' | 'INVALID' | 'EMPTY';
  message: string;
} {
  if (!barcode || barcode.trim() === '') {
    return {
      isValid: true, // Campo é opcional, então vazio é válido
      type: 'EMPTY',
      message: '',
    };
  }

  // Remove espaços e caracteres não numéricos
  const cleaned = barcode.replace(/\D/g, '');

  if (cleaned.length !== 13 && cleaned.length !== 8) {
    return {
      isValid: false,
      type: 'INVALID',
      message: 'EAN deve ter 13 dígitos (EAN-13) ou 8 dígitos (EAN-8)',
    };
  }

  const type = cleaned.length === 13 ? 'EAN-13' : 'EAN-8';
  const dataDigits = cleaned.slice(0, -1);
  const checkDigit = parseInt(cleaned.slice(-1), 10);
  const calculatedCheckDigit = calculateEANCheckDigit(
    dataDigits,
    type === 'EAN-13'
  );

  if (checkDigit !== calculatedCheckDigit) {
    return {
      isValid: false,
      type,
      message: `Dígito verificador inválido. Esperado: ${calculatedCheckDigit}, recebido: ${checkDigit}`,
    };
  }

  return {
    isValid: true,
    type,
    message: `${type} válido`,
  };
}

/**
 * Gera um EAN-13 válido aleatório
 */
export function generateEAN13(): string {
  // Gera 12 dígitos aleatórios
  // O primeiro dígito não pode ser 0
  const firstDigit = Math.floor(Math.random() * 9) + 1;
  const remainingDigits = Array.from({ length: 11 }, () =>
    Math.floor(Math.random() * 10)
  ).join('');
  const dataDigits = `${firstDigit}${remainingDigits}`;

  // Calcula o dígito verificador
  const checkDigit = calculateEANCheckDigit(dataDigits, true);

  return `${dataDigits}${checkDigit}`;
}

/**
 * Gera um EAN-8 válido aleatório
 */
export function generateEAN8(): string {
  // Gera 7 dígitos aleatórios
  // O primeiro dígito não pode ser 0
  const firstDigit = Math.floor(Math.random() * 9) + 1;
  const remainingDigits = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 10)
  ).join('');
  const dataDigits = `${firstDigit}${remainingDigits}`;

  // Calcula o dígito verificador
  const checkDigit = calculateEANCheckDigit(dataDigits, false);

  return `${dataDigits}${checkDigit}`;
}

/**
 * Gera um EAN válido (EAN-13 por padrão)
 */
export function generateEAN(type: 'EAN-13' | 'EAN-8' = 'EAN-13'): string {
  return type === 'EAN-13' ? generateEAN13() : generateEAN8();
}

/**
 * Gera um EAN-13 a partir de uma sequência numérica
 * @param sequence - Número sequencial (será formatado com zeros à esquerda)
 * @returns EAN-13 válido (13 dígitos)
 */
export function generateEAN13FromSequence(sequence: number | string): string {
  // Converte para string e formata com zeros à esquerda para ter 12 dígitos
  const sequenceStr = sequence.toString().padStart(12, '0');

  // Calcula o dígito verificador
  const checkDigit = calculateEANCheckDigit(sequenceStr, true);

  return `${sequenceStr}${checkDigit}`;
}
