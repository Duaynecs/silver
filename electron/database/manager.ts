import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import bcrypt from 'bcrypt';

export class DatabaseManager {
  private db: Database.Database;
  private orm: ReturnType<typeof drizzle>;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.orm = drizzle(this.db, { schema });

    this.initialize();
  }

  private initialize() {
    // Cria as tabelas se não existirem
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        sale_price REAL NOT NULL DEFAULT 0,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cpf_cnpj TEXT UNIQUE,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        notes TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cash_register (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opening_date INTEGER NOT NULL,
        closing_date INTEGER,
        initial_amount REAL NOT NULL DEFAULT 0,
        final_amount REAL,
        expected_amount REAL,
        difference REAL,
        status TEXT NOT NULL DEFAULT 'open',
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER,
        cash_register_id INTEGER,
        total_amount REAL NOT NULL,
        discount REAL NOT NULL DEFAULT 0,
        final_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        notes TEXT,
        sale_date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (cash_register_id) REFERENCES cash_register(id)
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        discount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS sale_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        payment_method_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_cost REAL,
        reference_id INTEGER,
        reference_type TEXT,
        notes TEXT,
        movement_date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cnpj TEXT UNIQUE,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
      CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
    `);

    // Migração: Adiciona novos campos de endereço na tabela customers se não existirem
    const tableInfo = this.db.prepare("PRAGMA table_info(customers)").all() as Array<{name: string}>;
    const hasNumberField = tableInfo.some(col => col.name === 'number');

    if (!hasNumberField) {
      this.db.exec(`
        ALTER TABLE customers ADD COLUMN number TEXT;
        ALTER TABLE customers ADD COLUMN neighborhood TEXT;
        ALTER TABLE customers ADD COLUMN complement TEXT;
      `);
    }

    // Migração: Remove coluna cost_price da tabela products (SQLite não suporta DROP COLUMN diretamente)
    const productsTableInfo = this.db.prepare("PRAGMA table_info(products)").all() as Array<{name: string}>;
    const hasCostPriceField = productsTableInfo.some(col => col.name === 'cost_price');

    if (hasCostPriceField) {
      // SQLite não suporta DROP COLUMN, então precisamos recriar a tabela
      this.db.exec(`
        -- Cria tabela temporária sem cost_price
        CREATE TABLE products_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          barcode TEXT UNIQUE,
          name TEXT NOT NULL,
          description TEXT,
          sale_price REAL NOT NULL DEFAULT 0,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          min_stock INTEGER NOT NULL DEFAULT 0,
          category TEXT,
          active INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        -- Copia dados (sem cost_price)
        INSERT INTO products_new (id, barcode, name, description, sale_price, stock_quantity, min_stock, category, active, created_at, updated_at)
        SELECT id, barcode, name, description, sale_price, stock_quantity, min_stock, category, active, created_at, updated_at
        FROM products;

        -- Remove tabela antiga
        DROP TABLE products;

        -- Renomeia nova tabela
        ALTER TABLE products_new RENAME TO products;

        -- Recria índice
        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      `);
    }

    // Migração: Adiciona campo parent_id na tabela categories se não existir
    const categoriesTableInfo = this.db.prepare("PRAGMA table_info(categories)").all() as Array<{name: string}>;
    const hasParentIdField = categoriesTableInfo.some(col => col.name === 'parent_id');

    if (!hasParentIdField) {
      this.db.exec(`
        ALTER TABLE categories ADD COLUMN parent_id INTEGER;
      `);
    }

    // Insere métodos de pagamento padrão se não existirem
    const paymentMethods = this.db
      .prepare('SELECT COUNT(*) as count FROM payment_methods')
      .get() as { count: number };
    if (paymentMethods.count === 0) {
      const now = Date.now();
      const insertPayment = this.db.prepare(
        'INSERT INTO payment_methods (name, active, created_at, updated_at) VALUES (?, ?, ?, ?)'
      );

      insertPayment.run('Dinheiro', 1, now, now);
      insertPayment.run('Cartão de Débito', 1, now, now);
      insertPayment.run('Cartão de Crédito', 1, now, now);
      insertPayment.run('PIX', 1, now, now);
    }

    // Insere usuário padrão se não existir
    const users = this.db
      .prepare('SELECT COUNT(*) as count FROM users')
      .get() as { count: number };
    if (users.count === 0) {
      const now = Date.now();
      // Senha padrão: "admin" - hash com bcrypt
      const hashedPassword = bcrypt.hashSync('admin', 10);
      this.db
        .prepare(
          'INSERT INTO users (username, password, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run('admin', hashedPassword, 'Administrador', now, now);
    }

    // Insere configurações padrão se não existirem
    const settings = this.db
      .prepare('SELECT COUNT(*) as count FROM settings')
      .get() as { count: number };
    if (settings.count === 0) {
      const now = Date.now();
      const insertSetting = this.db.prepare(
        'INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)'
      );

      insertSetting.run('commission_percentage', '0', now, now);
    }

    // Migração: Adiciona empresa padrão e campo company_id nas tabelas
    const companies = this.db
      .prepare('SELECT COUNT(*) as count FROM companies')
      .get() as { count: number };

    if (companies.count === 0) {
      // Cria empresa padrão
      const now = Date.now();
      this.db
        .prepare(
          'INSERT INTO companies (name, active, created_at, updated_at) VALUES (?, ?, ?, ?)'
        )
        .run('Empresa Principal', 1, now, now);
    }

    // Obtém o ID da primeira empresa (será a empresa padrão)
    const defaultCompany = this.db
      .prepare('SELECT id FROM companies ORDER BY id LIMIT 1')
      .get() as { id: number } | undefined;

    if (defaultCompany) {
      const defaultCompanyId = defaultCompany.id;

      // Migração: Adiciona company_id em users
      const usersTableInfo = this.db.prepare("PRAGMA table_info(users)").all() as Array<{name: string}>;
      const usersHasCompanyId = usersTableInfo.some(col => col.name === 'company_id');

      if (!usersHasCompanyId) {
        this.db.exec(`
          ALTER TABLE users ADD COLUMN company_id INTEGER NOT NULL DEFAULT ${defaultCompanyId};
          CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
        `);
      }

      // Migração: Adiciona company_id em products
      const productsTableInfoCompany = this.db.prepare("PRAGMA table_info(products)").all() as Array<{name: string}>;
      const productsHasCompanyId = productsTableInfoCompany.some(col => col.name === 'company_id');

      if (!productsHasCompanyId) {
        this.db.exec(`
          ALTER TABLE products ADD COLUMN company_id INTEGER NOT NULL DEFAULT ${defaultCompanyId};
          CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
        `);
      }

      // Migração: Adiciona company_id em customers
      const customersTableInfoCompany = this.db.prepare("PRAGMA table_info(customers)").all() as Array<{name: string}>;
      const customersHasCompanyId = customersTableInfoCompany.some(col => col.name === 'company_id');

      if (!customersHasCompanyId) {
        this.db.exec(`
          ALTER TABLE customers ADD COLUMN company_id INTEGER NOT NULL DEFAULT ${defaultCompanyId};
          CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
        `);
      }

      // Migração: Adiciona company_id em categories
      const categoriesTableInfoCompany = this.db.prepare("PRAGMA table_info(categories)").all() as Array<{name: string}>;
      const categoriesHasCompanyId = categoriesTableInfoCompany.some(col => col.name === 'company_id');

      if (!categoriesHasCompanyId) {
        this.db.exec(`
          ALTER TABLE categories ADD COLUMN company_id INTEGER NOT NULL DEFAULT ${defaultCompanyId};
          CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id);
        `);
      }

      // Migração: Adiciona company_id em payment_methods
      const paymentMethodsTableInfoCompany = this.db.prepare("PRAGMA table_info(payment_methods)").all() as Array<{name: string}>;
      const paymentMethodsHasCompanyId = paymentMethodsTableInfoCompany.some(col => col.name === 'company_id');

      if (!paymentMethodsHasCompanyId) {
        this.db.exec(`
          ALTER TABLE payment_methods ADD COLUMN company_id INTEGER NOT NULL DEFAULT ${defaultCompanyId};
          CREATE INDEX IF NOT EXISTS idx_payment_methods_company ON payment_methods(company_id);
        `);
      }

      // Migração: Adiciona company_id em cash_register
      const cashRegisterTableInfoCompany = this.db.prepare("PRAGMA table_info(cash_register)").all() as Array<{name: string}>;
      const cashRegisterHasCompanyId = cashRegisterTableInfoCompany.some(col => col.name === 'company_id');

      if (!cashRegisterHasCompanyId) {
        this.db.exec(`
          ALTER TABLE cash_register ADD COLUMN company_id INTEGER NOT NULL DEFAULT ${defaultCompanyId};
          CREATE INDEX IF NOT EXISTS idx_cash_register_company ON cash_register(company_id);
        `);
      }

      // Migração: Adiciona company_id em sales
      const salesTableInfoCompany = this.db.prepare("PRAGMA table_info(sales)").all() as Array<{name: string}>;
      const salesHasCompanyId = salesTableInfoCompany.some(col => col.name === 'company_id');

      if (!salesHasCompanyId) {
        this.db.exec(`
          ALTER TABLE sales ADD COLUMN company_id INTEGER NOT NULL DEFAULT ${defaultCompanyId};
          CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
        `);
      }

      // Migração: Adiciona company_id em stock_movements
      const stockMovementsTableInfoCompany = this.db.prepare("PRAGMA table_info(stock_movements)").all() as Array<{name: string}>;
      const stockMovementsHasCompanyId = stockMovementsTableInfoCompany.some(col => col.name === 'company_id');

      if (!stockMovementsHasCompanyId) {
        this.db.exec(`
          ALTER TABLE stock_movements ADD COLUMN company_id INTEGER NOT NULL DEFAULT ${defaultCompanyId};
          CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);
        `);
      }
    }

    // Migração: Adiciona image_path em products
    const productsTableInfoImage = this.db.prepare("PRAGMA table_info(products)").all() as Array<{name: string}>;
    const hasImagePathField = productsTableInfoImage.some(col => col.name === 'image_path');

    if (!hasImagePathField) {
      this.db.exec(`
        ALTER TABLE products ADD COLUMN image_path TEXT;
      `);
    }

    // Migração: Adiciona company_id em settings e remove UNIQUE constraint de key
    const settingsTableInfo = this.db.prepare("PRAGMA table_info(settings)").all() as Array<{name: string}>;
    const settingsHasCompanyId = settingsTableInfo.some(col => col.name === 'company_id');

    if (!settingsHasCompanyId && defaultCompany) {
      const defaultCompanyId = defaultCompany.id;

      // SQLite não permite modificar constraints, então recriamos a tabela
      this.db.exec(`
        -- Cria tabela temporária com company_id
        CREATE TABLE settings_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          company_id INTEGER NOT NULL DEFAULT ${defaultCompanyId},
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        -- Copia dados existentes, associando à empresa padrão
        INSERT INTO settings_new (id, key, value, company_id, created_at, updated_at)
        SELECT id, key, value, ${defaultCompanyId}, created_at, updated_at
        FROM settings;

        -- Remove tabela antiga
        DROP TABLE settings;

        -- Renomeia nova tabela
        ALTER TABLE settings_new RENAME TO settings;

        -- Cria índice único composto (key + company_id)
        CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key_company ON settings(key, company_id);
        CREATE INDEX IF NOT EXISTS idx_settings_company ON settings(company_id);
      `);
    }

    // Migração: Adiciona campo accepts_change em payment_methods
    const paymentMethodsTableInfo = this.db.prepare("PRAGMA table_info(payment_methods)").all() as Array<{name: string}>;
    const hasAcceptsChangeField = paymentMethodsTableInfo.some(col => col.name === 'accepts_change');

    if (!hasAcceptsChangeField) {
      this.db.exec(`
        ALTER TABLE payment_methods ADD COLUMN accepts_change INTEGER NOT NULL DEFAULT 0;
      `);

      // Define "Dinheiro" como método que aceita troco
      this.db.exec(`
        UPDATE payment_methods SET accepts_change = 1 WHERE name = 'Dinheiro';
      `);
    }

    // Migração: Adiciona campo change_amount em sales
    const salesTableInfo = this.db.prepare("PRAGMA table_info(sales)").all() as Array<{name: string}>;
    const hasChangeAmountField = salesTableInfo.some(col => col.name === 'change_amount');

    if (!hasChangeAmountField) {
      this.db.exec(`
        ALTER TABLE sales ADD COLUMN change_amount REAL NOT NULL DEFAULT 0;
      `);
    }

    // Migração: Altera UNIQUE constraints para serem company-scoped
    // Verifica se já foi aplicada checando os índices existentes
    const existingIndexes = this.db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='products'").all() as Array<{name: string}>;
    const needsProductsMigration = !existingIndexes.some(idx => idx.name === 'idx_products_company_barcode');

    if (needsProductsMigration) {
      console.log('Iniciando migração: Alterando UNIQUE constraint de products.barcode para company-scoped');

      // Desabilita foreign keys temporariamente para permitir DROP TABLE
      this.db.exec(`PRAGMA foreign_keys = OFF;`);

      // Remove tabela temporária se existir de migração anterior falha
      this.db.exec(`DROP TABLE IF EXISTS products_new;`);

      // Cria nova tabela products com constraint correta
      this.db.exec(`
        CREATE TABLE products_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL REFERENCES companies(id),
          barcode TEXT,
          name TEXT NOT NULL,
          description TEXT,
          sale_price REAL NOT NULL DEFAULT 0,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          min_stock INTEGER NOT NULL DEFAULT 0,
          category TEXT,
          active INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          UNIQUE(company_id, barcode)
        );
      `);

      // Copia dados da tabela antiga
      this.db.exec(`
        INSERT INTO products_new (id, company_id, barcode, name, description, sale_price,
                                   stock_quantity, min_stock, category, active, created_at, updated_at)
        SELECT id, company_id, barcode, name, description, sale_price,
               stock_quantity, min_stock, category, active, created_at, updated_at
        FROM products;
      `);

      // Remove tabela antiga e renomeia nova
      this.db.exec(`
        DROP TABLE products;
        ALTER TABLE products_new RENAME TO products;
      `);

      // Recria índices
      this.db.exec(`
        CREATE INDEX idx_products_company_barcode ON products(company_id, barcode);
        CREATE INDEX idx_products_name ON products(name);
        CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
      `);

      // Re-habilita foreign keys
      this.db.exec(`PRAGMA foreign_keys = ON;`);

      console.log('Migração de products.barcode concluída');
    }

    // Migração similar para customers
    const existingCustomerIndexes = this.db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='customers'").all() as Array<{name: string}>;
    const needsCustomersMigration = !existingCustomerIndexes.some(idx => idx.name === 'idx_customers_company_cpf_cnpj');

    if (needsCustomersMigration) {
      console.log('Iniciando migração: Alterando UNIQUE constraint de customers.cpf_cnpj para company-scoped');

      // Desabilita foreign keys temporariamente para permitir DROP TABLE
      this.db.exec(`PRAGMA foreign_keys = OFF;`);

      // Remove tabela temporária se existir de migração anterior falha
      this.db.exec(`DROP TABLE IF EXISTS customers_new;`);

      // Cria nova tabela customers com constraint correta
      this.db.exec(`
        CREATE TABLE customers_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL REFERENCES companies(id),
          name TEXT NOT NULL,
          cpf_cnpj TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          zip_code TEXT,
          notes TEXT,
          active INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          UNIQUE(company_id, cpf_cnpj)
        );
      `);

      // Copia dados da tabela antiga
      this.db.exec(`
        INSERT INTO customers_new (id, company_id, name, cpf_cnpj, phone, email, address,
                                    city, state, zip_code, notes, active, created_at, updated_at)
        SELECT id, company_id, name, cpf_cnpj, phone, email, address,
               city, state, zip_code, notes, active, created_at, updated_at
        FROM customers;
      `);

      // Remove tabela antiga e renomeia nova
      this.db.exec(`
        DROP TABLE customers;
        ALTER TABLE customers_new RENAME TO customers;
      `);

      // Recria índices
      this.db.exec(`
        CREATE INDEX idx_customers_company_cpf_cnpj ON customers(company_id, cpf_cnpj);
        CREATE INDEX idx_customers_name ON customers(name);
        CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
      `);

      // Re-habilita foreign keys
      this.db.exec(`PRAGMA foreign_keys = ON;`);

      console.log('Migração de customers.cpf_cnpj concluída');
    }

    // Migração: Hash de senhas existentes em plaintext
    console.log('Verificando senhas em plaintext...');
    const allUsers = this.db.prepare('SELECT id, password FROM users').all() as Array<{id: number; password: string}>;

    let hashedCount = 0;
    for (const user of allUsers) {
      // Verifica se a senha já está hasheada (bcrypt hashes começam com $2a$, $2b$ ou $2y$)
      if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$')) {
        // Senha está em plaintext, precisa ser hasheada
        const hashedPassword = bcrypt.hashSync(user.password, 10);
        this.db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?')
          .run(hashedPassword, Date.now(), user.id);
        hashedCount++;
      }
    }

    if (hashedCount > 0) {
      console.log(`Migração de senhas concluída: ${hashedCount} senha(s) hasheada(s)`);
    }
  }

  query(sql: string, params: any[] = []) {
    return this.db.prepare(sql).all(...params);
  }

  execute(sql: string, params: any[] = []) {
    return this.db.prepare(sql).run(...params);
  }

  getORM() {
    return this.orm;
  }

  close() {
    this.db.close();
  }
}
