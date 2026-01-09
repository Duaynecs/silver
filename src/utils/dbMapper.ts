/**
 * Converte uma string de snake_case para camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converte um objeto do formato do banco de dados (snake_case) para o formato TypeScript (camelCase)
 * Também converte campos 'active' de número (1/0) para boolean
 */
export function mapDbToType<T extends Record<string, any>>(dbRow: any): T {
  const result: any = {};

  for (const [key, value] of Object.entries(dbRow)) {
    const camelKey = snakeToCamel(key);

    // Converte campos 'active' de número para boolean
    if (camelKey === 'active') {
      result[camelKey] = value === 1 || value === true;
    } else {
      result[camelKey] = value;
    }
  }

  return result as T;
}

/**
 * Converte um array de objetos do banco de dados para o formato TypeScript
 */
export function mapDbArrayToType<T extends Record<string, any>>(
  dbRows: any[]
): T[] {
  return dbRows.map((row) => mapDbToType<T>(row));
}
