import { getUnifiedDb } from './unified-db'

export async function createAdminClient() {
  try {
    const { database: db } = await getUnifiedDb()
    return {
      database: db,
      from: (table: string) => db.from(table),
      rpc: (fn: string, params: any) => (db as any).rpc ? (db as any).rpc(fn, params) : null
    }
  } catch (err) {
    console.error('[SupabaseServer] Failed to create admin client:', err)
    return null
  }
}

export async function createServerClient() {
  try {
    const { database: db } = await getUnifiedDb()
    return db
  } catch (err) {
    console.error('[SupabaseServer] Failed to create server client:', err)
    return null
  }
}
