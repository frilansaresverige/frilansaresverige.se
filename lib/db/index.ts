import 'server-only'

import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

import { databaseEnv } from '@/lib/env'
import * as schema from './schema'

type Database = MySql2Database<typeof schema>

// Kept on globalThis so that hot reloading in development doesn't open a new
// pool on every edit.
const globalForDb = globalThis as typeof globalThis & { db?: Database }

export const db = (): Database => {
  if (!globalForDb.db) {
    const env = databaseEnv()
    const pool = mysql.createPool({
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE,
      charset: 'utf8mb4_unicode_ci',
      waitForConnections: true,
      connectionLimit: 10,
    })
    globalForDb.db = drizzle(pool, { schema, mode: 'default' })
  }

  return globalForDb.db
}
