import { randomBytes, scryptSync } from 'node:crypto';
import mysql from 'mysql2/promise';
import { databaseConfig, loadLocalEnv } from './env.mjs';

loadLocalEnv();
const args = Object.fromEntries(process.argv.slice(2).map(value => value.replace(/^--/, '').split(/=(.*)/s).slice(0, 2)));
const email = String(args.email || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const fullName = String(args.name || process.env.ADMIN_NAME || 'Platform administrator').trim();
const password = String(args.password || process.env.ADMIN_PASSWORD || '');
if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Provide --email=admin@example.org or ADMIN_EMAIL.');
if (password.length < 12) throw new Error('Provide a password of at least 12 characters with --password=... or ADMIN_PASSWORD.');
const salt = randomBytes(16).toString('hex');
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const id = `usr_${randomBytes(12).toString('hex')}`;
const connection = await mysql.createConnection(databaseConfig());
try {
  await connection.beginTransaction();
  await connection.execute(`INSERT INTO users (id,full_name,email,password_hash,status) VALUES (?,?,?,?, 'ACTIVE') ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),password_hash=VALUES(password_hash),status='ACTIVE'`, [id, fullName, email, passwordHash]);
  const [[user]] = await connection.execute('SELECT id FROM users WHERE email=?', [email]);
  await connection.execute('DELETE FROM user_roles WHERE user_id=?', [user.id]);
  await connection.execute("INSERT INTO user_roles (user_id,role_id) VALUES (?, 'role_super_admin')", [user.id]);
  await connection.commit();
  process.stdout.write(`Administrator created for ${email}.\n`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
