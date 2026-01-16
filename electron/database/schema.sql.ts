/**
 * Schema SQL inicial do banco de dados
 * Este arquivo contém a estrutura base das tabelas
 * Migrações incrementais devem ser adicionadas em /migrations
 */

export const INITIAL_SCHEMA = `
  -- Tabela de usuários
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    company_id INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Tabela de empresas
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

  -- Tabela de produtos
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    description TEXT,
    sale_price REAL NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    image_path TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(company_id, barcode),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  -- Tabela de clientes
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    cpf_cnpj TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    number TEXT,
    neighborhood TEXT,
    complement TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(company_id, cpf_cnpj),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  -- Tabela de métodos de pagamento
  CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    accepts_change INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  -- Tabela de categorias
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_id INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(company_id, name),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  -- Tabela de caixa
  CREATE TABLE IF NOT EXISTS cash_register (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    opening_date INTEGER NOT NULL,
    closing_date INTEGER,
    initial_amount REAL NOT NULL DEFAULT 0,
    final_amount REAL,
    expected_amount REAL,
    difference REAL,
    status TEXT NOT NULL DEFAULT 'open',
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  -- Tabela de vendas
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    sale_number TEXT NOT NULL UNIQUE,
    customer_id INTEGER,
    cash_register_id INTEGER,
    total_amount REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    final_amount REAL NOT NULL,
    change_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    notes TEXT,
    sale_date INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (cash_register_id) REFERENCES cash_register(id)
  );

  -- Tabela de itens de venda
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

  -- Tabela de pagamentos de venda
  CREATE TABLE IF NOT EXISTS sale_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    payment_method_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
  );

  -- Tabela de movimentações de estoque
  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_cost REAL,
    reference_id INTEGER,
    reference_type TEXT,
    notes TEXT,
    movement_date INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Tabela de configurações
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  -- Tabela de protocolos de estoque
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
  );

  -- Tabela de movimentos de protocolo
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
  );

  -- Tabela de controle de versão do schema
  CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    applied_at INTEGER NOT NULL,
    description TEXT
  );

  -- Índices para melhor performance
  CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
  CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
  CREATE INDEX IF NOT EXISTS idx_products_company_barcode ON products(company_id, barcode);
  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
  CREATE INDEX IF NOT EXISTS idx_customers_company_cpf_cnpj ON customers(company_id, cpf_cnpj);
  CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
  CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id);
  CREATE INDEX IF NOT EXISTS idx_categories_company_name ON categories(company_id, name);
  CREATE INDEX IF NOT EXISTS idx_payment_methods_company ON payment_methods(company_id);
  CREATE INDEX IF NOT EXISTS idx_cash_register_company ON cash_register(company_id);
  CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
  CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
  CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
  CREATE INDEX IF NOT EXISTS idx_settings_key_company ON settings(key, company_id);
  CREATE INDEX IF NOT EXISTS idx_settings_company ON settings(company_id);
  CREATE INDEX IF NOT EXISTS idx_stock_protocols_number ON stock_protocols(protocol_number);
  CREATE INDEX IF NOT EXISTS idx_stock_protocols_type ON stock_protocols(type);
  CREATE INDEX IF NOT EXISTS idx_stock_protocols_status ON stock_protocols(status);
  CREATE INDEX IF NOT EXISTS idx_stock_protocols_reference ON stock_protocols(reference_type, reference_id);
  CREATE INDEX IF NOT EXISTS idx_stock_protocol_movements_protocol ON stock_protocol_movements(protocol_id);
  CREATE INDEX IF NOT EXISTS idx_stock_protocol_movements_product ON stock_protocol_movements(product_id);
`;

export const SCHEMA_VERSION = '1.0.0';
