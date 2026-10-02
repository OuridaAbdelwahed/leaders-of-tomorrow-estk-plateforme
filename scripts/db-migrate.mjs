import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { databaseConfig, loadLocalEnv } from './env.mjs';

loadLocalEnv();
const config = databaseConfig();
const admin = await mysql.createConnection({ ...config, database: undefined, multipleStatements: true });
await admin.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.replaceAll('`', '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await admin.end();

const connection = await mysql.createConnection({ ...config, multipleStatements: true });
try {
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const directory = path.resolve(process.cwd(), 'database', 'migrations');
  const files = (await fs.readdir(directory)).filter(file => file.endsWith('.sql')).sort();
  const [appliedRows] = await connection.query('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.map(row => row.version));
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(directory, file), 'utf8');
    await connection.beginTransaction();
    try {
      await connection.query(sql);
      await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
      await connection.commit();
      process.stdout.write(`Applied ${file}\n`);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
  process.stdout.write(files.length ? 'Database migrations are up to date.\n' : 'No migrations found.\n');
} finally {
  await connection.end();
}
