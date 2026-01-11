import Database from 'better-sqlite3';

export interface StockProtocol {
  id: number;
  protocolNumber: string;
  type: 'sale' | 'purchase' | 'adjustment' | 'zero_stock' | 'inventory';
  status: 'active' | 'cancelled';
  referenceId?: number;
  referenceType?: string;
  createdAt: number;
  cancelledAt?: number;
  cancelledBy?: number;
  notes?: string;
}

export interface StockProtocolMovement {
  id: number;
  protocolId: number;
  productId: number;
  quantityBefore: number;
  quantityAfter: number;
  quantityChanged: number;
  createdAt: number;
}

export interface ProductMovement {
  productId: number;
  quantityChanged: number;
}

export class ProtocolManager {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Gera um número de protocolo único
   */
  private generateProtocolNumber(): string {
    const year = new Date().getFullYear();
    const result = this.db.prepare(
      'SELECT COUNT(*) as count FROM stock_protocols WHERE protocol_number LIKE ?'
    ).get(`PRT-${year}-%`) as { count: number };

    const sequence = (result.count + 1).toString().padStart(6, '0');
    return `PRT-${year}-${sequence}`;
  }

  /**
   * Cria um novo protocolo de estoque
   */
  createProtocol(
    type: StockProtocol['type'],
    movements: ProductMovement[],
    options?: {
      referenceId?: number;
      referenceType?: string;
      notes?: string;
    }
  ): string {
    const protocolNumber = this.generateProtocolNumber();
    const now = Date.now();

    // Inicia transação
    const transaction = this.db.transaction(() => {
      // Insere o protocolo
      const result = this.db.prepare(`
        INSERT INTO stock_protocols (
          protocol_number, type, status, reference_id, reference_type, created_at, notes
        ) VALUES (?, ?, 'active', ?, ?, ?, ?)
      `).run(
        protocolNumber,
        type,
        options?.referenceId || null,
        options?.referenceType || null,
        now,
        options?.notes || null
      );

      const protocolId = result.lastInsertRowid as number;

      // Registra os movimentos
      for (const movement of movements) {
        // Busca quantidade atual do produto
        const product = this.db.prepare(
          'SELECT stock_quantity FROM products WHERE id = ?'
        ).get(movement.productId) as { stock_quantity: number } | undefined;

        if (!product) {
          throw new Error(`Product ${movement.productId} not found`);
        }

        const quantityBefore = product.stock_quantity;
        const quantityAfter = quantityBefore + movement.quantityChanged;

        // Registra o movimento no protocolo
        this.db.prepare(`
          INSERT INTO stock_protocol_movements (
            protocol_id, product_id, quantity_before, quantity_after, quantity_changed, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          protocolId,
          movement.productId,
          quantityBefore,
          quantityAfter,
          movement.quantityChanged,
          now
        );

        // Atualiza o estoque do produto
        this.db.prepare(
          'UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?'
        ).run(quantityAfter, now, movement.productId);

        // Registra na tabela de movimentos de estoque (compatibilidade)
        this.db.prepare(`
          INSERT INTO stock_movements (
            product_id, type, quantity, movement_date, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          movement.productId,
          type,
          movement.quantityChanged,
          now,
          `Protocolo: ${protocolNumber}`,
          now
        );
      }
    });

    // Executa a transação
    transaction();

    return protocolNumber;
  }

  /**
   * Cancela um protocolo existente (rollback do estoque)
   */
  cancelProtocol(protocolNumber: string, cancelledBy?: number): void {
    const now = Date.now();

    // Busca o protocolo
    const protocol = this.db.prepare(
      'SELECT * FROM stock_protocols WHERE protocol_number = ?'
    ).get(protocolNumber) as StockProtocol | undefined;

    if (!protocol) {
      throw new Error(`Protocol ${protocolNumber} not found`);
    }

    if (protocol.status === 'cancelled') {
      throw new Error(`Protocol ${protocolNumber} is already cancelled`);
    }

    // Busca os movimentos do protocolo
    const movements = this.db.prepare(
      'SELECT * FROM stock_protocol_movements WHERE protocol_id = ?'
    ).all(protocol.id) as StockProtocolMovement[];

    // Inicia transação para reverter
    const transaction = this.db.transaction(() => {
      // Marca o protocolo como cancelado
      this.db.prepare(`
        UPDATE stock_protocols
        SET status = 'cancelled', cancelled_at = ?, cancelled_by = ?
        WHERE id = ?
      `).run(now, cancelledBy || null, protocol.id);

      // Reverte os movimentos de estoque
      for (const movement of movements) {
        // Restaura a quantidade anterior
        this.db.prepare(
          'UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?'
        ).run(movement.quantityBefore, now, movement.productId);

        // Registra o cancelamento nos movimentos de estoque
        this.db.prepare(`
          INSERT INTO stock_movements (
            product_id, type, quantity, movement_date, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          movement.productId,
          'ajuste',
          -movement.quantityChanged,
          now,
          `Cancelamento do protocolo: ${protocolNumber}`,
          now
        );
      }
    });

    // Executa a transação
    transaction();
  }

  /**
   * Busca um protocolo por número
   */
  getProtocol(protocolNumber: string): (StockProtocol & { movements: StockProtocolMovement[] }) | null {
    const protocol = this.db.prepare(
      'SELECT * FROM stock_protocols WHERE protocol_number = ?'
    ).get(protocolNumber) as StockProtocol | undefined;

    if (!protocol) {
      return null;
    }

    const movements = this.db.prepare(
      'SELECT * FROM stock_protocol_movements WHERE protocol_id = ?'
    ).all(protocol.id) as StockProtocolMovement[];

    return {
      ...protocol,
      movements
    };
  }

  /**
   * Lista protocolos com filtros
   */
  listProtocols(filters?: {
    type?: string;
    status?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
    offset?: number;
  }): StockProtocol[] {
    let query = 'SELECT * FROM stock_protocols WHERE 1=1';
    const params: any[] = [];

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.startDate) {
      query += ' AND created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ' AND created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    return this.db.prepare(query).all(...params) as StockProtocol[];
  }

  /**
   * Busca protocolos por referência
   */
  getProtocolsByReference(referenceType: string, referenceId: number): StockProtocol[] {
    return this.db.prepare(
      'SELECT * FROM stock_protocols WHERE reference_type = ? AND reference_id = ? ORDER BY created_at DESC'
    ).all(referenceType, referenceId) as StockProtocol[];
  }
}
