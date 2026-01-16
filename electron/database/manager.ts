import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import bcrypt from 'bcrypt';
import { MigrationManager } from './migrationManager';
import { ProtocolManager } from './protocolManager';
import { join } from 'path';
import { INITIAL_SCHEMA, SCHEMA_VERSION } from './schema.sql';

export class DatabaseManager {
  private db: Database.Database;
  private orm: ReturnType<typeof drizzle>;
  private migrationManager: MigrationManager;
  private protocolManager: ProtocolManager;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.orm = drizzle(this.db, { schema });

    // Inicializa o sistema de migrations
    const migrationsPath = join(__dirname, 'migrations');
    this.migrationManager = new MigrationManager(this.db, migrationsPath);

    // Inicializa o gerenciador de protocolos
    this.protocolManager = new ProtocolManager(this.db);

    this.initialize();
  }

  private initialize() {
    const schemaVersion = this.migrationManager.getSchemaVersion();

    // Se não há versão do schema, é um banco novo ou legado
    if (!schemaVersion) {
      this.initializeNewDatabase();
    } else {
      console.log(`Database schema version: ${schemaVersion}`);
    }

    // Executa migrações legadas (para bancos antigos)
    this.runLegacyMigrations();

    // Executa migrations pendentes do novo sistema
    this.runMigrations();
  }

  /**
   * Inicializa um banco de dados novo com o schema completo
   */
  private initializeNewDatabase() {
    console.log('Initializing new database...');

    // Verifica se já existe dados (banco legado)
    const hasUsers = this.tableExists('users') && this.hasData('users');

    if (!hasUsers) {
      // Banco totalmente novo - cria schema completo
      console.log('Creating initial schema...');
      this.db.exec(INITIAL_SCHEMA);
      this.migrationManager.setSchemaVersion(SCHEMA_VERSION, 'Initial schema');
      this.seedDefaultData();
    } else {
      // Banco legado - marca versão mas não recria tabelas
      console.log('Legacy database detected, registering schema version...');
      this.migrationManager.setSchemaVersion('0.9.0', 'Legacy database');
    }
  }

  /**
   * Verifica se uma tabela existe
   */
  private tableExists(tableName: string): boolean {
    const result = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(tableName);
    return !!result;
  }

  /**
   * Verifica se uma tabela tem dados
   */
  private hasData(tableName: string): boolean {
    try {
      const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
      return result.count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Insere dados padrão no banco
   */
  private seedDefaultData() {
    const now = Date.now();

    // Cria empresa padrão
    const companyExists = this.hasData('companies');
    let defaultCompanyId = 1;

    if (!companyExists) {
      this.db.prepare(
        'INSERT INTO companies (name, active, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run('Empresa Principal', 1, now, now);

      const company = this.db.prepare('SELECT id FROM companies ORDER BY id LIMIT 1').get() as { id: number };
      defaultCompanyId = company.id;
    }

    // Insere métodos de pagamento padrão
    const paymentMethods = this.db.prepare('SELECT COUNT(*) as count FROM payment_methods').get() as { count: number };
    if (paymentMethods.count === 0) {
      const insertPayment = this.db.prepare(
        'INSERT INTO payment_methods (company_id, name, accepts_change, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      insertPayment.run(defaultCompanyId, 'Dinheiro', 1, 1, now, now);
      insertPayment.run(defaultCompanyId, 'Cartão de Débito', 0, 1, now, now);
      insertPayment.run(defaultCompanyId, 'Cartão de Crédito', 0, 1, now, now);
      insertPayment.run(defaultCompanyId, 'PIX', 0, 1, now, now);
    }

    // Insere usuário padrão
    const users = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (users.count === 0) {
      const hashedPassword = bcrypt.hashSync('admin', 10);
      this.db.prepare(
        'INSERT INTO users (username, password, name, company_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('admin', hashedPassword, 'Administrador', defaultCompanyId, now, now);
    }

    // Insere configurações padrão
    const settings = this.db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
    if (settings.count === 0) {
      this.db.prepare(
        'INSERT INTO settings (company_id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run(defaultCompanyId, 'commission_percentage', '0', now, now);
    }

    console.log('Default data seeded successfully');
  }

  /**
   * Executa migrações legadas para bancos antigos
   * Estas migrações são idempotentes e seguras para rodar múltiplas vezes
   */
  private runLegacyMigrations() {
    // Verifica se é um banco legado que precisa de migrações
    const schemaVersion = this.migrationManager.getSchemaVersion();
    if (schemaVersion === SCHEMA_VERSION) {
      // Banco novo com schema completo, não precisa de migrações legadas
      return;
    }

    console.log('Running legacy migrations...');

    // Migração: Adiciona novos campos de endereço na tabela customers
    this.addColumnIfNotExists('customers', 'number', 'TEXT');
    this.addColumnIfNotExists('customers', 'neighborhood', 'TEXT');
    this.addColumnIfNotExists('customers', 'complement', 'TEXT');

    // Migração: Adiciona campo parent_id na tabela categories
    this.addColumnIfNotExists('categories', 'parent_id', 'INTEGER');

    // Migração: Adiciona image_path em products
    this.addColumnIfNotExists('products', 'image_path', 'TEXT');

    // Migração: Adiciona campo accepts_change em payment_methods
    if (this.addColumnIfNotExists('payment_methods', 'accepts_change', 'INTEGER NOT NULL DEFAULT 0')) {
      this.db.exec("UPDATE payment_methods SET accepts_change = 1 WHERE name = 'Dinheiro'");
    }

    // Migração: Adiciona campo change_amount em sales
    this.addColumnIfNotExists('sales', 'change_amount', 'REAL NOT NULL DEFAULT 0');

    // Migração: Adiciona company_id nas tabelas que ainda não têm
    const defaultCompany = this.db.prepare('SELECT id FROM companies ORDER BY id LIMIT 1').get() as { id: number } | undefined;
    if (defaultCompany) {
      const companyId = defaultCompany.id;
      this.addCompanyIdIfNotExists('users', companyId);
      this.addCompanyIdIfNotExists('products', companyId);
      this.addCompanyIdIfNotExists('customers', companyId);
      this.addCompanyIdIfNotExists('categories', companyId);
      this.addCompanyIdIfNotExists('payment_methods', companyId);
      this.addCompanyIdIfNotExists('cash_register', companyId);
      this.addCompanyIdIfNotExists('sales', companyId);
      this.addCompanyIdIfNotExists('stock_movements', companyId);
    }

    // Migração: Hash de senhas em plaintext
    this.hashPlaintextPasswords();

    // Atualiza versão do schema se necessário
    if (schemaVersion && schemaVersion < SCHEMA_VERSION) {
      this.migrationManager.setSchemaVersion(SCHEMA_VERSION, 'Legacy migrations applied');
    }

    console.log('Legacy migrations completed');
  }

  /**
   * Adiciona uma coluna se não existir
   */
  private addColumnIfNotExists(table: string, column: string, type: string): boolean {
    const tableInfo = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    const hasColumn = tableInfo.some(col => col.name === column);

    if (!hasColumn) {
      try {
        this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`Added column ${column} to ${table}`);
        return true;
      } catch (error) {
        console.error(`Error adding column ${column} to ${table}:`, error);
      }
    }
    return false;
  }

  /**
   * Adiciona company_id em uma tabela se não existir
   */
  private addCompanyIdIfNotExists(table: string, defaultCompanyId: number): void {
    const tableInfo = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    const hasCompanyId = tableInfo.some(col => col.name === 'company_id');

    if (!hasCompanyId) {
      try {
        this.db.exec(`
          ALTER TABLE ${table} ADD COLUMN company_id INTEGER NOT NULL DEFAULT ${defaultCompanyId};
          CREATE INDEX IF NOT EXISTS idx_${table}_company ON ${table}(company_id);
        `);
        console.log(`Added company_id to ${table}`);
      } catch (error) {
        console.error(`Error adding company_id to ${table}:`, error);
      }
    }
  }

  /**
   * Hash senhas em plaintext
   */
  private hashPlaintextPasswords(): void {
    const users = this.db.prepare('SELECT id, password FROM users').all() as Array<{ id: number; password: string }>;

    let hashedCount = 0;
    for (const user of users) {
      // Verifica se a senha já está hasheada
      if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$')) {
        const hashedPassword = bcrypt.hashSync(user.password, 10);
        this.db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?')
          .run(hashedPassword, Date.now(), user.id);
        hashedCount++;
      }
    }

    if (hashedCount > 0) {
      console.log(`Hashed ${hashedCount} plaintext password(s)`);
    }
  }

  /**
   * Executa migrations pendentes
   */
  private runMigrations() {
    try {
      console.log('Checking pending migrations...');
      this.migrationManager.runPendingMigrations();
      console.log('✓ Migrations completed');
    } catch (error) {
      console.error('✗ Error running migrations:', error);
      throw error;
    }
  }

  getProtocolManager(): ProtocolManager {
    return this.protocolManager;
  }

  getMigrationManager(): MigrationManager {
    return this.migrationManager;
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
