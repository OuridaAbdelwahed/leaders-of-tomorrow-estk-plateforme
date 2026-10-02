import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

declare global {
  var lotMysqlPool: Pool | undefined;
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const host = process.env.MYSQL_HOST?.trim() || process.env.DB_HOST?.trim();
const database = process.env.MYSQL_DATABASE?.trim() || process.env.DB_DATABASE?.trim() || process.env.DB_NAME?.trim();
const user = process.env.MYSQL_USER?.trim() || process.env.DB_USERNAME?.trim() || process.env.DB_USER?.trim();

export const isDatabaseConfigured = Boolean(databaseUrl || (host && database && user));

export function getDatabasePool() {
  if (!isDatabaseConfigured) {
    throw new Error('MariaDB is not configured. Copy .env.example to .env.local and configure the DB_* values.');
  }
  if (globalThis.lotMysqlPool) return globalThis.lotMysqlPool;
  globalThis.lotMysqlPool = databaseUrl
    ? mysql.createPool(databaseUrl)
    : mysql.createPool({
        host,
        port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
        database,
        user,
        password: process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? '',
        charset: 'utf8mb4',
        timezone: 'Z',
        waitForConnections: true,
        connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || process.env.DB_CONNECTION_LIMIT || 5),
        enableKeepAlive: true,
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
      });
  return globalThis.lotMysqlPool;
}

export async function queryRows<T extends RowDataPacket>(sql: string, values: unknown[] = [], connection?: PoolConnection) {
  const executor = connection ?? getDatabasePool();
  const [rows] = await executor.execute<T[]>(sql, values as never[]);
  return rows;
}

export async function execute(sql: string, values: unknown[] = [], connection?: PoolConnection) {
  const executor = connection ?? getDatabasePool();
  const [result] = await executor.execute<ResultSetHeader>(sql, values as never[]);
  return result;
}

export async function withTransaction<T>(work: (connection: PoolConnection) => Promise<T>) {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function testDatabaseConnection() {
  const rows = await queryRows<RowDataPacket & { database_name: string; charset_name: string }>(
    "SELECT DATABASE() AS database_name, @@character_set_connection AS charset_name",
  );
  return rows[0];
}
