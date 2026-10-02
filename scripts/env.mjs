import fs from 'node:fs';
import path from 'node:path';

export function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    const target = path.resolve(process.cwd(), file);
    if (!fs.existsSync(target)) continue;
    for (const line of fs.readFileSync(target, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equals = trimmed.indexOf('=');
      if (equals < 1) continue;
      const key = trimmed.slice(0, equals).trim();
      let value = trimmed.slice(equals + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[key] ??= value;
    }
  }
}

export function databaseConfig() {
  return {
    host: process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
    database: process.env.DB_DATABASE || process.env.MYSQL_DATABASE || 'leaders_db',
    user: process.env.DB_USERNAME || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? '',
    charset: 'utf8mb4',
    timezone: 'Z',
  };
}
