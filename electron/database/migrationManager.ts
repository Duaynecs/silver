import Database from 'better-sqlite3';
import { readdirSync } from 'fs';
import { join } from 'path';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
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
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        executed_at INTEGER NOT NULL
      )
    `);
  }

  private getExecutedMigrations(): number[] {
    const rows = this.db.prepare('SELECT version FROM migrations ORDER BY version').all() as { version: number }[];
    return rows.map(row => row.version);
  }

  private markMigrationAsExecuted(version: number, name: string) {
    this.db.prepare(
      'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)'
    ).run(version, name, Date.now());
  }

  private markMigrationAsReverted(version: number) {
    this.db.prepare('DELETE FROM migrations WHERE version = ?').run(version);
  }

  async loadMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];

    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
        .sort();

      for (const file of files) {
        const migrationPath = join(this.migrationsPath, file);
        const migration = await import(migrationPath);

        if (migration.default && typeof migration.default === 'object') {
          const { version, name, up, down } = migration.default;

          if (typeof version !== 'number' || typeof name !== 'string' || typeof up !== 'function' || typeof down !== 'function') {
            console.warn(`Migration ${file} has invalid format, skipping...`);
            continue;
          }

          migrations.push({ version, name, up, down });
        }
      }

      return migrations.sort((a, b) => a.version - b.version);
    } catch (error) {
      console.error('Error loading migrations:', error);
      return [];
    }
  }

  async runPendingMigrations(): Promise<void> {
    const executedVersions = this.getExecutedMigrations();
    const allMigrations = await this.loadMigrations();
    const pendingMigrations = allMigrations.filter(m => !executedVersions.includes(m.version));

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to run');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migration(s)...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Running migration ${migration.version}: ${migration.name}`);

        // Cria um backup antes de executar a migration
        const backupPath = `${this.db.name}.backup-migration-${migration.version}`;
        this.db.backup(backupPath);
        console.log(`Backup created at: ${backupPath}`);

        // Executa a migration em uma transação
        const runMigration = this.db.transaction(() => {
          migration.up(this.db);
          this.markMigrationAsExecuted(migration.version, migration.name);
        });

        runMigration();
        console.log(`✓ Migration ${migration.version} completed successfully`);
      } catch (error) {
        console.error(`✗ Migration ${migration.version} failed:`, error);
        throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${error}`);
      }
    }

    console.log('All migrations completed successfully');
  }

  async revertLastMigration(): Promise<void> {
    const executedVersions = this.getExecutedMigrations();

    if (executedVersions.length === 0) {
      console.log('No migrations to revert');
      return;
    }

    const lastVersion = executedVersions[executedVersions.length - 1];
    const allMigrations = await this.loadMigrations();
    const migration = allMigrations.find(m => m.version === lastVersion);

    if (!migration) {
      throw new Error(`Migration ${lastVersion} not found`);
    }

    try {
      console.log(`Reverting migration ${migration.version}: ${migration.name}`);

      const revertMigration = this.db.transaction(() => {
        migration.down(this.db);
        this.markMigrationAsReverted(migration.version);
      });

      revertMigration();
      console.log(`✓ Migration ${migration.version} reverted successfully`);
    } catch (error) {
      console.error(`✗ Failed to revert migration ${migration.version}:`, error);
      throw error;
    }
  }

  getCurrentVersion(): number {
    const executedVersions = this.getExecutedMigrations();
    return executedVersions.length > 0 ? Math.max(...executedVersions) : 0;
  }

  async getStatus(): Promise<{ current: number; pending: Migration[]; executed: number[] }> {
    const executed = this.getExecutedMigrations();
    const all = await this.loadMigrations();
    const pending = all.filter(m => !executed.includes(m.version));
    const current = this.getCurrentVersion();

    return { current, pending, executed };
  }
}
