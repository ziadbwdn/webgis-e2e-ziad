import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { databaseConfig } from '../config/database.config';

interface MigrationRecord {
  id: string;
  executed_at: Date;
}

const pool = new Pool(databaseConfig);

async function ensureMigrationsTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Migrations table ready');
  } catch (error) {
    console.error('Failed to create migrations table:', error);
    throw error;
  }
}

async function getMigratedFiles(): Promise<Set<string>> {
  try {
    const result = await pool.query<MigrationRecord>('SELECT id FROM migrations ORDER BY executed_at');
    return new Set(result.rows.map(row => row.id));
  } catch (error) {
    console.error('Failed to get migrated files:', error);
    throw error;
  }
}

async function runMigration(filePath: string, fileName: string): Promise<void> {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO migrations (id) VALUES ($1)', [fileName]);
    await client.query('COMMIT');
    console.log(`✓ ${fileName} completed`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ ${fileName} failed:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function migrate(): Promise<void> {
  console.log('Starting database migrations...\n');

  try {
    await ensureMigrationsTable();
    const migratedFiles = await getMigratedFiles();

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found');
      return;
    }

    let migrationsRun = 0;
    for (const file of files) {
      if (!migratedFiles.has(file)) {
        const filePath = path.join(migrationsDir, file);
        await runMigration(filePath, file);
        migrationsRun++;
      }
    }

    if (migrationsRun === 0) {
      console.log('\n✓ All migrations already applied');
    } else {
      console.log(`\n✓ ${migrationsRun} migration(s) completed successfully`);
    }
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
