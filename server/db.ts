import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite)

export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  username:     text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  cloudEnabled: integer('cloud_enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt:    integer('created_at').notNull(),
})

export const notes = sqliteTable('notes', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id),
  title:     text('title').notNull().default(''),
  content:   text('content').notNull().default(''),
  folderId:  text('folder_id'),
  tags:      text('tags').notNull().default('[]'),
  starred:   integer('starred', { mode: 'boolean' }).notNull().default(false),
  wordCount: integer('word_count').notNull().default(0),
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const folders = sqliteTable('folders', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id),
  name:      text('name').notNull(),
  parentId:  text('parent_id'),
  order:     integer('order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
})

export const comments = sqliteTable('comments', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id),
  content:   text('content').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const inviteCodes = sqliteTable('invite_codes', {
  code:         text('code').primaryKey(),
  usedByUserId: text('used_by_user_id'),
  usedAt:       integer('used_at'),
})

export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      cloud_enabled INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      folder_id TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      starred INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      parent_id TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      used_by_user_id TEXT,
      used_at INTEGER
    );
  `)

  const INVITE_CODES = [
    'MIKI-A7X2-KP9Q', 'MIKI-B3N8-WR4L', 'MIKI-C6M1-ZT7Y',
    'MIKI-D9F5-HJ2V', 'MIKI-E4K3-QN6U', 'MIKI-F8R7-XG1S',
    'MIKI-G2W4-LB5E', 'MIKI-H5T9-MC8D', 'MIKI-J1P6-VF3O',
    'MIKI-K7Q2-YH4N',
  ]
  const insert = sqlite.prepare(`INSERT OR IGNORE INTO invite_codes (code) VALUES (?)`)
  for (const code of INVITE_CODES) insert.run(code)
}
