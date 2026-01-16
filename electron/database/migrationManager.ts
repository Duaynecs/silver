import Database from 'better-sqlite3';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

export interface MigrationStatus {
  currentVersion: number;
  schemaVersion: string | null;
  pendingMigrations: Migration[];
  executedMigrations: { version: number; name: string; executedAt: number }[];
}

export class MigrationManager {
  private db: Database.Database;
  private migrationsPath: string;

  constructor(db: Database.Database, migrationsPath: string) {
    this.db = db;
    this.migrationsPath = migrationsPath;
    this.initMigrationsTable();
  }

  private initMigrationsTable() {
    // Tabela para controle de migrations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        executed_at INTEGER NOT NULL
      )
    `);

    // Tabela para controle de versão do schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        applied_at INTEGER NOT NULL,
        description TEXT
      )
    `);
  }

  /**
   * Obtém a versão atual do schema
   */
  getSchemaVersion(): string | null {
    try {
      const row = this.db.prepare(
        'SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1'
      ).get() as { version: string } | undefined;
      return row?.version || null;
    } catch {
      return null;
    }
  }

  /**
   * Define a versão do schema
   */
  setSchemaVersion(version: string, description?: string): void {
    this.db.prepare(
      'INSERT INTO schema_version (version, applied_at, description) VALUES (?, ?, ?)'
    ).run(version, Date.now(), description || null);
  }

  /**
   * Obtém lista de migrations já executadas
   */
  private getExecutedMigrations(): { version: number; name: string; executedAt: number }[] {
    try {
      const rows = this.db.prepare(
        'SELECT version, name, executed_at as executedAt FROM migrations ORDER BY version'
      ).all() as { version: number; name: string; executedAt: number }[];
      return rows;
    } catch {
      return [];
    }
  }

  /**
   * Obtém apenas os números de versão das migrations executadas
   */
  private getExecutedVersions(): number[] {
    return this.getExecutedMigrations().map(m => m.version);
  }

  /**
   * Marca uma migration como executada
   */
  private markMigrationAsExecuted(version: number, name: string): void {
    this.db.prepare(
      'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)'
    ).run(version, name, Date.now());
  }

  /**
   * Marca uma migration como revertida
   */
  private markMigrationAsReverted(version: number): void {
    this.db.prepare('DELETE FROM migrations WHERE version = ?').run(version);
  }

  /**
   * Carrega todas as migrations do diretório
   */
  async loadMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];

    if (!existsSync(this.migrationsPath)) {
      console.log(`Migrations path does not exist: ${this.migrationsPath}`);
      return [];
    }

    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
        .sort();

      for (const file of files) {
        try {
          const migrationPath = join(this.migrationsPath, file);
          const migration = await import(migrationPath);

          if (migration.default && typeof migration.default === 'object') {
            const { version, name, up, down } = migration.default;

            if (
              typeof version !== 'number' ||
              typeof name !== 'string' ||
              typeof up !== 'function' ||
              typeof down !== 'function'
            ) {
              console.warn(`Migration ${file} has invalid format, skipping...`);
              continue;
            }

            migrations.push({ version, name, up, down });
          }
        } catch (error) {
          console.error(`Error loading migration ${file}:`, error);
        }
      }

      return migrations.sort((a, b) => a.version - b.version);
    } catch (error) {
      console.error('Error loading migrations:', error);
      return [];
    }
  }

  /**
   * Executa todas as migrations pendentes
   */
  async runPendingMigrations(): Promise<{ executed: number; errors: string[] }> {
    const executedVersions = this.getExecutedVersions();
    const allMigrations = await this.loadMigrations();
    const pendingMigrations = allMigrations.filter(m => !executedVersions.includes(m.version));

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to run');
      return { executed: 0, errors: [] };
    }

    console.log(`Running ${pendingMigrations.length} pending migration(s)...`);

    let executed = 0;
    const errors: string[] = [];

    for (const migration of pendingMigrations) {
      try {
        console.log(`Running migration ${migration.version}: ${migration.name}`);

        // Executa a migration em uma transação
        const runMigration = this.db.transaction(() => {
          migration.up(this.db);
          this.markMigrationAsExecuted(migration.version, migration.name);
        });

        runMigration();
        executed++;
        console.log(`✓ Migration ${migration.version} completed successfully`);
      } catch (error: any) {
        const errorMsg = `Migration ${migration.version} (${migration.name}) failed: ${error.message}`;
        console.error(`✗ ${errorMsg}`);
        errors.push(errorMsg);
        // Continua com as próximas migrations em vez de parar
        break; // Para na primeira falha para manter consistência
      }
    }

    if (executed > 0) {
      console.log(`Migrations completed: ${executed} executed, ${errors.length} errors`);
    }

    return { executed, errors };
  }

  /**
   * Executa uma migration específica
   */
  async runMigration(version: number): Promise<boolean> {
    const executedVersions = this.getExecutedVersions();

    if (executedVersions.includes(version)) {
      console.log(`Migration ${version} already executed`);
      return false;
    }

    const allMigrations = await this.loadMigrations();
    const migration = allMigrations.find(m => m.version === version);

    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }

    try {
      console.log(`Running migration ${migration.version}: ${migration.name}`);

      const runMigration = this.db.transaction(() => {
        migration.up(this.db);
        this.markMigrationAsExecuted(migration.version, migration.name);
      });

      runMigration();
      console.log(`✓ Migration ${migration.version} completed successfully`);
      return true;
    } catch (error: any) {
      console.error(`✗ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  /**
   * Reverte a última migration executada
   */
  async revertLastMigration(): Promise<boolean> {
    const executedMigrations = this.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('No migrations to revert');
      return false;
    }

    const lastMigration = executedMigrations[executedMigrations.length - 1];
    const allMigrations = await this.loadMigrations();
    const migration = allMigrations.find(m => m.version === lastMigration.version);

    if (!migration) {
      throw new Error(`Migration ${lastMigration.version} not found for revert`);
    }

    try {
      console.log(`Reverting migration ${migration.version}: ${migration.name}`);

      const revertMigration = this.db.transaction(() => {
        migration.down(this.db);
        this.markMigrationAsReverted(migration.version);
      });

      revertMigration();
      console.log(`✓ Migration ${migration.version} reverted successfully`);
      return true;
    } catch (error: any) {
      console.error(`✗ Failed to revert migration ${migration.version}:`, error);
      throw error;
    }
  }

  /**
   * Reverte uma migration específica
   */
  async revertMigration(version: number): Promise<boolean> {
    const executedVersions = this.getExecutedVersions();

    if (!executedVersions.includes(version)) {
      console.log(`Migration ${version} not executed, cannot revert`);
      return false;
    }

    const allMigrations = await this.loadMigrations();
    const migration = allMigrations.find(m => m.version === version);

    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }

    try {
      console.log(`Reverting migration ${migration.version}: ${migration.name}`);

      const revertMigration = this.db.transaction(() => {
        migration.down(this.db);
        this.markMigrationAsReverted(migration.version);
      });

      revertMigration();
      console.log(`✓ Migration ${migration.version} reverted successfully`);
      return true;
    } catch (error: any) {
      console.error(`✗ Failed to revert migration ${migration.version}:`, error);
      throw error;
    }
  }

  /**
   * Obtém a versão atual da migration
   */
  getCurrentVersion(): number {
    const executedVersions = this.getExecutedVersions();
    return executedVersions.length > 0 ? Math.max(...executedVersions) : 0;
  }

  /**
   * Obtém o status completo das migrations
   */
  async getStatus(): Promise<MigrationStatus> {
    const executed = this.getExecutedMigrations();
    const executedVersions = executed.map(m => m.version);
    const all = await this.loadMigrations();
    const pending = all.filter(m => !executedVersions.includes(m.version));
    const schemaVersion = this.getSchemaVersion();

    return {
      currentVersion: this.getCurrentVersion(),
      schemaVersion,
      pendingMigrations: pending,
      executedMigrations: executed,
    };
  }

  /**
   * Verifica se o banco precisa de migrations
   */
  async needsMigrations(): Promise<boolean> {
    const executedVersions = this.getExecutedVersions();
    const allMigrations = await this.loadMigrations();
    return allMigrations.some(m => !executedVersions.includes(m.version));
  }

  /**
   * Cria backup antes de executar migrations
   */
  createBackup(backupPath: string): void {
    try {
      this.db.backup(backupPath);
      console.log(`Backup created at: ${backupPath}`);
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }
}
