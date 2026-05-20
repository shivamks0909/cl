import { createClient } from '@supabase/supabase-js'
import { getDb } from './db'
import * as crypto from 'crypto'

// Detect if we're on Vercel (production)
const isVercel = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1'

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

class QueryBuilder {
    tableName: string
    selectCols: string = '*'
    filters: Array<{ col: string; op: string; val: any }> = []
    orderCol: string | null = null
    orderAsc: boolean = true
    limitVal: number | null = null
    offsetVal: number | null = null
    isSingle: boolean = false
    isMaybeSingle: boolean = false
    isCountOnly: boolean = false
    countHead: boolean = false
    insertData: any = null
    updateData: any = null
    deleteFlag: boolean = false

    constructor(tableName: string) {
        this.tableName = tableName
    }

    select(cols: string = '*', opts?: { count?: 'exact'; head?: boolean }) {
        this.selectCols = cols
        if (opts?.count === 'exact') {
            this.isCountOnly = true
        }
        if (opts?.head) {
            this.countHead = true
        }
        return this
    }

    insert(data: any) {
        this.insertData = data
        return this
    }

    update(data: any) {
        this.updateData = data
        return this
    }

    delete() {
        this.deleteFlag = true
        return this
    }

    eq(col: string, val: any) {
        this.filters.push({ col, op: '=', val })
        return this
    }

    neq(col: string, val: any) {
        this.filters.push({ col, op: '<>', val })
        return this
    }

    gt(col: string, val: any) {
        this.filters.push({ col, op: '>', val })
        return this
    }

    gte(col: string, val: any) {
        this.filters.push({ col, op: '>=', val })
        return this
    }

    lt(col: string, val: any) {
        this.filters.push({ col, op: '<', val })
        return this
    }

    lte(col: string, val: any) {
        this.filters.push({ col, op: '<=', val })
        return this
    }

    in(col: string, val: any[]) {
        this.filters.push({ col, op: 'IN', val })
        return this
    }

    ilike(col: string, val: string) {
        this.filters.push({ col, op: 'ILIKE', val })
        return this
    }

    order(col: string, opts?: { ascending?: boolean }) {
        this.orderCol = col
        this.orderAsc = opts?.ascending !== false
        return this
    }

    limit(num: number) {
        this.limitVal = num
        return this
    }

    range(from: number, to: number) {
        this.offsetVal = from
        this.limitVal = to - from + 1
        return this
    }

    single() {
        this.isSingle = true
        return this
    }

    maybeSingle() {
        this.isMaybeSingle = true
        return this
    }

    async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
        try {
            const db = getDb()
            let sql = ''
            const params: any[] = []

            // Map column names to support SQLite schema variance
            const mapCol = (colName: string) => {
                if (this.tableName === 'admins' && colName === 'password') {
                    return 'password_hash'
                }
                return colName
            }

            // Normalize JSON columns helper
            const isJsonCol = (colName: string) => {
                return ['metadata', 'payload', 'geoData', 'queryParams'].includes(colName)
            }

            const serializeVal = (col: string, val: any) => {
                if (val !== null && typeof val === 'object') {
                    return JSON.stringify(val)
                }
                return val
            }

            const deserializeRow = (row: any) => {
                if (!row) return row
                const copy = { ...row }
                
                // Map password_hash back to password for compatibility
                if (this.tableName === 'admins' && 'password_hash' in copy) {
                    copy.password = copy.password_hash
                }

                for (const key of Object.keys(copy)) {
                    if (isJsonCol(key) && typeof copy[key] === 'string') {
                        try {
                            copy[key] = JSON.parse(copy[key])
                        } catch {
                            // Leave as is
                        }
                    }
                }
                return copy
            }

            // Build WHERE clause
            const buildWhere = () => {
                if (this.filters.length === 0) return ''
                const parts: string[] = []
                for (const filter of this.filters) {
                    const mappedCol = mapCol(filter.col)
                    if (filter.val === null) {
                        if (filter.op === '=') {
                            parts.push(`"${mappedCol}" IS NULL`)
                        } else {
                            parts.push(`"${mappedCol}" IS NOT NULL`)
                        }
                    } else if (filter.op === 'IN') {
                        const inList = filter.val as any[]
                        if (inList.length === 0) {
                            parts.push('1 = 0') // Always false
                        } else {
                            const placeholders = inList.map(() => '?').join(', ')
                            parts.push(`"${mappedCol}" IN (${placeholders})`)
                            params.push(...inList.map(v => serializeVal(filter.col, v)))
                        }
                    } else if (filter.op === 'ILIKE') {
                        parts.push(`"${mappedCol}" LIKE ?`)
                        params.push(filter.val)
                    } else {
                        parts.push(`"${mappedCol}" ${filter.op} ?`)
                        params.push(serializeVal(filter.col, filter.val))
                    }
                }
                return ' WHERE ' + parts.join(' AND ')
            }

            // Query the table columns dynamically to filter out unsupported keys
            const tableCols = db.pragma(`table_info("${this.tableName}")`) as any[]
            const validCols = new Set(tableCols.map(c => c.name))

            let resultData: any = null
            let resultCount: number | null = null

            if (this.insertData) {
                // INSERT
                const rowsToInsert = Array.isArray(this.insertData) ? this.insertData : [this.insertData]
                const insertedRows: any[] = []

                for (const rawRow of rowsToInsert) {
                    const row = { ...rawRow }
                    if (!row.id) {
                        if (['tracking_sessions', 'responses', 'clients', 'projects', 'suppliers', 'audit_logs'].includes(this.tableName)) {
                            row.id = crypto.randomUUID()
                        }
                    }

                    const keys = Object.keys(row).filter(k => validCols.has(mapCol(k)))
                    const cols = keys.map(k => `"${mapCol(k)}"`).join(', ')
                    const placeholders = keys.map(() => '?').join(', ')
                    const insertSql = `INSERT INTO "${this.tableName}" (${cols}) VALUES (${placeholders})`
                    const insertParams = keys.map(k => serializeVal(k, row[k]))

                    db.prepare(insertSql).run(...insertParams)

                    // Retrieve inserted row
                    const selectSql = `SELECT * FROM "${this.tableName}" WHERE id = ?`
                    const inserted = db.prepare(selectSql).get(row.id)
                    insertedRows.push(deserializeRow(inserted))
                }

                resultData = Array.isArray(this.insertData) ? insertedRows : insertedRows[0]

            } else if (this.updateData) {
                // UPDATE
                const keys = Object.keys(this.updateData).filter(k => validCols.has(mapCol(k)))
                const sets = keys.map(k => `"${mapCol(k)}" = ?`).join(', ')
                const updateParams = keys.map(k => serializeVal(k, this.updateData[k]))

                const whereClause = buildWhere()
                const updateSql = `UPDATE "${this.tableName}" SET ${sets}${whereClause}`
                
                // Get affected IDs before running update so we can return them
                const selectSql = `SELECT id FROM "${this.tableName}"${whereClause}`
                const affectedRows = db.prepare(selectSql).all(...params)

                db.prepare(updateSql).run(...updateParams, ...params)

                const updatedRows: any[] = []
                for (const row of affectedRows as any[]) {
                    const updated = db.prepare(`SELECT * FROM "${this.tableName}" WHERE id = ?`).get(row.id)
                    updatedRows.push(deserializeRow(updated))
                }

                resultData = updatedRows

            } else if (this.deleteFlag) {
                // DELETE
                const whereClause = buildWhere()
                const deleteSql = `DELETE FROM "${this.tableName}"${whereClause}`
                
                const selectSql = `SELECT * FROM "${this.tableName}"${whereClause}`
                const rowsToDelete = db.prepare(selectSql).all(...params)

                db.prepare(deleteSql).run(...params)
                resultData = rowsToDelete.map(r => deserializeRow(r))

            } else {
                // SELECT
                const whereClause = buildWhere()

                if (this.isCountOnly) {
                    const countSql = `SELECT COUNT(*) as count FROM "${this.tableName}"${whereClause}`
                    const countRow = db.prepare(countSql).get(...params) as any
                    resultCount = countRow.count
                    
                    if (this.countHead) {
                        resultData = []
                    } else {
                        let selectSql = `SELECT ${this.selectCols} FROM "${this.tableName}"${whereClause}`
                        if (this.orderCol) {
                            selectSql += ` ORDER BY "${this.orderCol}" ${this.orderAsc ? 'ASC' : 'DESC'}`
                        }
                        if (this.limitVal !== null) {
                            selectSql += ` LIMIT ${this.limitVal}`
                        }
                        if (this.offsetVal !== null) {
                            selectSql += ` OFFSET ${this.offsetVal}`
                        }
                        const rows = db.prepare(selectSql).all(...params)
                        resultData = rows.map(r => deserializeRow(r))
                    }
                } else {
                    let selectSql = `SELECT ${this.selectCols} FROM "${this.tableName}"${whereClause}`
                    if (this.orderCol) {
                        selectSql += ` ORDER BY "${this.orderCol}" ${this.orderAsc ? 'ASC' : 'DESC'}`
                    }
                    if (this.limitVal !== null) {
                        selectSql += ` LIMIT ${this.limitVal}`
                    }
                    if (this.offsetVal !== null) {
                        selectSql += ` OFFSET ${this.offsetVal}`
                    }

                    const rows = db.prepare(selectSql).all(...params)
                    resultData = rows.map(r => deserializeRow(r))
                }
            }

            let formattedData = resultData
            let error = null

            if (!this.insertData && !this.updateData && !this.deleteFlag) {
                if (this.isSingle) {
                    if (!resultData || resultData.length === 0) {
                        formattedData = null
                        error = { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }
                    } else {
                        formattedData = resultData[0]
                    }
                } else if (this.isMaybeSingle) {
                    if (!resultData || resultData.length === 0) {
                        formattedData = null
                    } else {
                        formattedData = resultData[0]
                    }
                }
            } else if (this.insertData && (this.isSingle || this.isMaybeSingle)) {
                formattedData = Array.isArray(resultData) ? resultData[0] : resultData
            }

            const response = {
                data: formattedData,
                error,
                count: resultCount
            }

            if (onfulfilled) {
                return onfulfilled(response)
            }
            return response

        } catch (err: any) {
            console.error(`[SqliteSupabaseShim] Error querying table ${this.tableName}:`, err)
            const response = {
                data: null,
                error: { message: err.message, code: 'SQLITE_ERROR' },
                count: null
            }
            if (onfulfilled) {
                return onfulfilled(response)
            }
            return response
        }
    }
}

class SqliteSupabaseShim {
    from(tableName: string) {
        return new QueryBuilder(tableName)
    }
    // Stub RPC to avoid crashes if called
    rpc(fn: string, params: any) {
        return {
            async then(onfulfilled?: (value: any) => any) {
                const response = { data: null, error: { message: 'RPC not implemented in SQLite shim' } }
                if (onfulfilled) return onfulfilled(response)
                return response
            }
        }
    }
}

export async function getUnifiedDb() {
    // If USE_SQLITE environment flag is active or Supabase credentials are missing or we are running in testing environment:
    const useSqlite = process.env.USE_SQLITE === 'true' || process.env.NODE_ENV === 'test' || !supabaseUrl

    if (useSqlite) {
        console.log('[unified-db] Using local SQLite database shim for unified client')
        return {
            source: 'sqlite' as const,
            database: new SqliteSupabaseShim() as any
        }
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
    if (!key) {
        throw new Error('Missing Supabase credentials: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY not set')
    }

    const supabase = createClient(supabaseUrl, key)

    return {
        source: 'supabase' as const,
        database: supabase
    }
}
