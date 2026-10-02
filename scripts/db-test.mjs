import mysql from 'mysql2/promise';
import { databaseConfig, loadLocalEnv } from './env.mjs';

loadLocalEnv();
const connection = await mysql.createConnection(databaseConfig());
try {
  const [[row]] = await connection.query('SELECT DATABASE() AS databaseName, @@character_set_connection AS charsetName, VERSION() AS version');
  process.stdout.write(`Connected to ${row.databaseName} (${row.version}) using ${row.charsetName}.\n`);
} finally {
  await connection.end();
}
