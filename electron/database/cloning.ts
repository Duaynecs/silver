import type { DatabaseManager } from './manager';

export interface CloningResult {
  inserted: number;
  updated: number;
  skipped: number;
}

export interface CloningReport {
  categories: CloningResult;
  products: CloningResult;
  customers: CloningResult;
  paymentMethods: CloningResult;
}

export interface CloningOptions {
  categories: boolean;
  products: boolean;
  customers: boolean;
  paymentMethods: boolean;
  updateMode: 'insert' | 'upsert';
}

export class DataCloning {
  constructor(private db: DatabaseManager) {}

  /**
   * Clona categorias de uma empresa para outra
   */
  async cloneCategories(
    sourceCompanyId: number,
    targetCompanyId: number,
    updateMode: 'insert' | 'upsert'
  ): Promise<CloningResult> {
    const result: CloningResult = { inserted: 0, updated: 0, skipped: 0 };

    try {
      // Busca todas as categorias da empresa origem
      const sourceCategories = this.db.query(
        'SELECT * FROM categories WHERE company_id = ? AND active = 1 ORDER BY parent_id IS NULL DESC, parent_id ASC',
        [sourceCompanyId]
      );

      if (!sourceCategories || sourceCategories.length === 0) {
        return result;
      }

      const now = Date.now();

      // Mapa para associar ID da categoria origem com ID da categoria destino
      const categoryIdMap = new Map<number, number>();

      for (const category of sourceCategories as any[]) {
        // Verifica se categoria já existe na empresa destino (por nome)
        const existing = this.db.query(
          'SELECT id FROM categories WHERE name = ? AND company_id = ?',
          [category.name, targetCompanyId]
        );

        // Se a categoria tem parent_id, mapeia para o novo ID na empresa destino
        let newParentId = category.parent_id;
        if (category.parent_id && categoryIdMap.has(category.parent_id)) {
          newParentId = categoryIdMap.get(category.parent_id);
        }

        if (existing && existing.length > 0) {
          const existingId = (existing[0] as any).id;
          // Guarda o mapeamento mesmo para categorias existentes
          categoryIdMap.set(category.id, existingId);

          if (updateMode === 'upsert') {
            // Atualiza categoria existente
            this.db.execute(
              `UPDATE categories
               SET description = ?, parent_id = ?, updated_at = ?
               WHERE name = ? AND company_id = ?`,
              [category.description, newParentId, now, category.name, targetCompanyId]
            );
            result.updated++;
          } else {
            // Modo insert - ignora existente
            result.skipped++;
          }
        } else {
          // Insere nova categoria
          const insertResult = this.db.execute(
            `INSERT INTO categories (name, description, parent_id, company_id, active, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, ?, ?)`,
            [category.name, category.description, newParentId, targetCompanyId, now, now]
          ) as any;

          // Guarda o mapeamento do ID antigo para o novo ID
          categoryIdMap.set(category.id, insertResult.lastInsertRowid);
          result.inserted++;
        }
      }
    } catch (error) {
      console.error('Erro ao clonar categorias:', error);
      throw error;
    }

    return result;
  }

  /**
   * Clona produtos de uma empresa para outra
   */
  async cloneProducts(
    sourceCompanyId: number,
    targetCompanyId: number,
    updateMode: 'insert' | 'upsert'
  ): Promise<CloningResult> {
    const result: CloningResult = { inserted: 0, updated: 0, skipped: 0 };

    try {
      // Busca todos os produtos da empresa origem
      const sourceProducts = this.db.query(
        'SELECT * FROM products WHERE company_id = ? AND active = 1',
        [sourceCompanyId]
      );

      if (!sourceProducts || sourceProducts.length === 0) {
        return result;
      }

      const now = Date.now();

      for (const product of sourceProducts as any[]) {
        let existing = null;

        // Se tem barcode, verifica por barcode
        if (product.barcode) {
          existing = this.db.query(
            'SELECT id FROM products WHERE barcode = ? AND company_id = ?',
            [product.barcode, targetCompanyId]
          );
        }

        // Se não encontrou por barcode, verifica por nome
        if (!existing || existing.length === 0) {
          existing = this.db.query(
            'SELECT id FROM products WHERE name = ? AND company_id = ?',
            [product.name, targetCompanyId]
          );
        }

        if (existing && existing.length > 0) {
          if (updateMode === 'upsert') {
            // Atualiza produto existente
            this.db.execute(
              `UPDATE products
               SET barcode = ?, name = ?, description = ?, sale_price = ?,
                   stock_quantity = ?, min_stock = ?, category = ?, image_path = ?, updated_at = ?
               WHERE id = ?`,
              [
                product.barcode,
                product.name,
                product.description,
                product.sale_price,
                product.stock_quantity,
                product.min_stock,
                product.category,
                product.image_path,
                now,
                (existing[0] as any).id,
              ]
            );
            result.updated++;
          } else {
            // Modo insert - ignora existente
            result.skipped++;
          }
        } else {
          // Insere novo produto
          this.db.execute(
            `INSERT INTO products (barcode, name, description, sale_price, stock_quantity, min_stock, category, image_path, company_id, active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              product.barcode,
              product.name,
              product.description,
              product.sale_price,
              product.stock_quantity,
              product.min_stock,
              product.category,
              product.image_path,
              targetCompanyId,
              now,
              now,
            ]
          );
          result.inserted++;
        }
      }
    } catch (error) {
      console.error('Erro ao clonar produtos:', error);
      throw error;
    }

    return result;
  }

  /**
   * Clona clientes de uma empresa para outra
   */
  async cloneCustomers(
    sourceCompanyId: number,
    targetCompanyId: number,
    updateMode: 'insert' | 'upsert'
  ): Promise<CloningResult> {
    const result: CloningResult = { inserted: 0, updated: 0, skipped: 0 };

    try {
      // Busca todos os clientes da empresa origem
      const sourceCustomers = this.db.query(
        'SELECT * FROM customers WHERE company_id = ? AND active = 1',
        [sourceCompanyId]
      );

      if (!sourceCustomers || sourceCustomers.length === 0) {
        return result;
      }

      const now = Date.now();

      for (const customer of sourceCustomers as any[]) {
        let existing = null;

        // Se tem CPF/CNPJ, verifica por documento
        if (customer.cpf_cnpj) {
          existing = this.db.query(
            'SELECT id FROM customers WHERE cpf_cnpj = ? AND company_id = ?',
            [customer.cpf_cnpj, targetCompanyId]
          );
        }

        // Se não encontrou por documento, verifica por nome
        if (!existing || existing.length === 0) {
          existing = this.db.query(
            'SELECT id FROM customers WHERE name = ? AND company_id = ?',
            [customer.name, targetCompanyId]
          );
        }

        if (existing && existing.length > 0) {
          if (updateMode === 'upsert') {
            // Atualiza cliente existente
            this.db.execute(
              `UPDATE customers
               SET name = ?, cpf_cnpj = ?, email = ?, phone = ?, address = ?, updated_at = ?
               WHERE id = ?`,
              [
                customer.name,
                customer.cpf_cnpj,
                customer.email,
                customer.phone,
                customer.address,
                now,
                (existing[0] as any).id,
              ]
            );
            result.updated++;
          } else {
            // Modo insert - ignora existente
            result.skipped++;
          }
        } else {
          // Insere novo cliente
          this.db.execute(
            `INSERT INTO customers (name, cpf_cnpj, email, phone, address, company_id, active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              customer.name,
              customer.cpf_cnpj,
              customer.email,
              customer.phone,
              customer.address,
              targetCompanyId,
              now,
              now,
            ]
          );
          result.inserted++;
        }
      }
    } catch (error) {
      console.error('Erro ao clonar clientes:', error);
      throw error;
    }

    return result;
  }

  /**
   * Clona formas de pagamento de uma empresa para outra
   */
  async clonePaymentMethods(
    sourceCompanyId: number,
    targetCompanyId: number,
    updateMode: 'insert' | 'upsert'
  ): Promise<CloningResult> {
    const result: CloningResult = { inserted: 0, updated: 0, skipped: 0 };

    try {
      // Busca todas as formas de pagamento da empresa origem
      const sourcePaymentMethods = this.db.query(
        'SELECT * FROM payment_methods WHERE company_id = ? AND active = 1',
        [sourceCompanyId]
      );

      if (!sourcePaymentMethods || sourcePaymentMethods.length === 0) {
        return result;
      }

      const now = Date.now();

      for (const paymentMethod of sourcePaymentMethods as any[]) {
        // Verifica se forma de pagamento já existe na empresa destino (por nome)
        const existing = this.db.query(
          'SELECT id FROM payment_methods WHERE name = ? AND company_id = ?',
          [paymentMethod.name, targetCompanyId]
        );

        if (existing && existing.length > 0) {
          if (updateMode === 'upsert') {
            // Atualiza forma de pagamento existente
            this.db.execute(
              `UPDATE payment_methods
               SET accepts_change = ?, updated_at = ?
               WHERE name = ? AND company_id = ?`,
              [paymentMethod.accepts_change || 0, now, paymentMethod.name, targetCompanyId]
            );
            result.updated++;
          } else {
            // Modo insert - ignora existente
            result.skipped++;
          }
        } else {
          // Insere nova forma de pagamento
          this.db.execute(
            `INSERT INTO payment_methods (name, accepts_change, company_id, active, created_at, updated_at)
             VALUES (?, ?, ?, 1, ?, ?)`,
            [paymentMethod.name, paymentMethod.accepts_change || 0, targetCompanyId, now, now]
          );
          result.inserted++;
        }
      }
    } catch (error) {
      console.error('Erro ao clonar formas de pagamento:', error);
      throw error;
    }

    return result;
  }

  /**
   * Executa a clonagem completa de dados entre empresas
   */
  async cloneData(
    sourceCompanyId: number,
    targetCompanyId: number,
    options: CloningOptions,
    onProgress?: (message: string) => void
  ): Promise<CloningReport> {
    const report: CloningReport = {
      categories: { inserted: 0, updated: 0, skipped: 0 },
      products: { inserted: 0, updated: 0, skipped: 0 },
      customers: { inserted: 0, updated: 0, skipped: 0 },
      paymentMethods: { inserted: 0, updated: 0, skipped: 0 },
    };

    try {
      // Valida se as empresas existem
      const sourceCompany = this.db.query('SELECT id FROM companies WHERE id = ?', [
        sourceCompanyId,
      ]);
      const targetCompany = this.db.query('SELECT id FROM companies WHERE id = ?', [
        targetCompanyId,
      ]);

      if (!sourceCompany || sourceCompany.length === 0) {
        throw new Error('Empresa origem não encontrada');
      }

      if (!targetCompany || targetCompany.length === 0) {
        throw new Error('Empresa destino não encontrada');
      }

      if (sourceCompanyId === targetCompanyId) {
        throw new Error('Empresa origem e destino devem ser diferentes');
      }

      // Clona categorias primeiro (pois produtos podem depender delas)
      if (options.categories) {
        onProgress?.('Clonando categorias...');
        report.categories = await this.cloneCategories(
          sourceCompanyId,
          targetCompanyId,
          options.updateMode
        );
      }

      // Clona produtos
      if (options.products) {
        onProgress?.('Clonando produtos...');
        report.products = await this.cloneProducts(
          sourceCompanyId,
          targetCompanyId,
          options.updateMode
        );
      }

      // Clona clientes
      if (options.customers) {
        onProgress?.('Clonando clientes...');
        report.customers = await this.cloneCustomers(
          sourceCompanyId,
          targetCompanyId,
          options.updateMode
        );
      }

      // Clona formas de pagamento
      if (options.paymentMethods) {
        onProgress?.('Clonando formas de pagamento...');
        report.paymentMethods = await this.clonePaymentMethods(
          sourceCompanyId,
          targetCompanyId,
          options.updateMode
        );
      }

      onProgress?.('Clonagem concluída!');
    } catch (error) {
      console.error('Erro ao clonar dados:', error);
      throw error;
    }

    return report;
  }
}
