import Database from 'better-sqlite3';

export default {
  version: 1,
  name: 'add_stock_protocols',

  up: (db: Database.Database) => {
    // Cria tabela de protocolos
    db.exec(`
      CREATE TABLE IF NOT EXISTS stock_protocols (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        protocol_number TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        reference_id INTEGER,
        reference_type TEXT,
        created_at INTEGER NOT NULL,
        cancelled_at INTEGER,
        cancelled_by INTEGER,
        notes TEXT
      )
    `);

    // Cria tabela de movimentos por protocolo
    db.exec(`
      CREATE TABLE IF NOT EXISTS stock_protocol_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        protocol_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity_before REAL NOT NULL,
        quantity_after REAL NOT NULL,
        quantity_changed REAL NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (protocol_id) REFERENCES stock_protocols(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Cria índices para melhor performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_stock_protocols_number ON stock_protocols(protocol_number);
      CREATE INDEX IF NOT EXISTS idx_stock_protocols_type ON stock_protocols(type);
      CREATE INDEX IF NOT EXISTS idx_stock_protocols_status ON stock_protocols(status);
      CREATE INDEX IF NOT EXISTS idx_stock_protocols_reference ON stock_protocols(reference_type, reference_id);
      CREATE INDEX IF NOT EXISTS idx_stock_protocol_movements_protocol ON stock_protocol_movements(protocol_id);
      CREATE INDEX IF NOT EXISTS idx_stock_protocol_movements_product ON stock_protocol_movements(product_id);
    `);

    console.log('✓ Stock protocols tables created successfully');
  },

  down: (db: Database.Database) => {
    // Remove índices
    db.exec(`
      DROP INDEX IF EXISTS idx_stock_protocol_movements_product;
      DROP INDEX IF EXISTS idx_stock_protocol_movements_protocol;
      DROP INDEX IF EXISTS idx_stock_protocols_reference;
      DROP INDEX IF EXISTS idx_stock_protocols_status;
      DROP INDEX IF EXISTS idx_stock_protocols_type;
      DROP INDEX IF EXISTS idx_stock_protocols_number;
    `);

    // Remove tabelas
    db.exec(`
      DROP TABLE IF EXISTS stock_protocol_movements;
      DROP TABLE IF EXISTS stock_protocols;
    `);

    console.log('✓ Stock protocols tables removed successfully');
  }
};
