import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(process.cwd(), 'data', 'chat.db');

// 确保数据目录存在
try {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
} catch {}

const db = new Database(DB_PATH);

// 初始化表结构
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

export default db;
