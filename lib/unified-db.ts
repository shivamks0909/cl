import { createClient } from '@supabase/supabase-js'

// Detect if we're on Vercel (production)
const isVercel = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1'

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function getUnifiedDb() {
    // Use Supabase directly - no InsForge fallback
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    return {
        source: 'supabase' as const,
        database: {
            from: (table: string) => {
                const builder: any = {
                    _table: table,
                    _select: '*',
                    _where: [],
                    _order: null,
                    _limit: null,
                    _offset: null,

                    select(columns: string = '*') {
                        this._select = columns
                        return this
                    },
                    eq(col: string, val: any) {
                        this._where.push({ col, op: 'eq', val })
                        return this
                    },
                    neq(col: string, val: any) {
                        this._where.push({ col, op: 'neq', val })
                        return this
                    },
                    gt(col: string, val: any) {
                        this._where.push({ col, op: 'gt', val })
                        return this
                    },
                    gte(col: string, val: any) {
                        this._where.push({ col, op: 'gte', val })
                        return this
                    },
                    lt(col: string, val: any) {
                        this._where.push({ col, op: 'lt', val })
                        return this
                    },
                    lte(col: string, val: any) {
                        this._where.push({ col, op: 'lte', val })
                        return this
                    },
                    in(col: string, vals: any[]) {
                        this._where.push({ col, op: 'in', val: vals })
                        return this
                    },
                    ilike(col: string, val: any) {
                        this._where.push({ col, op: 'ilike', val })
                        return this
                    },
                    is(col: string, val: any) {
                        this._where.push({ col, op: 'is', val })
                        return this
                    },
                    limit(n: number) {
                        this._limit = n
                        return this
                    },
                    offset(n: number) {
                        this._offset = n
                        return this
                    },
                    order(col: string, opts?: any) {
                        this._order = { col, ascending: opts?.ascending !== false }
                        return this
                    },
                    insert(rows: any[]) {
                        return supabase.from(this._table).insert(rows).select()
                    },
                    update(updates: Record<string, any>) {
                        this._updates = updates
                        return this
                    },
                    delete() {
                        this._deleting = true
                        return this
                    },
                    async maybeSingle() {
                        const query = this._buildQuery(supabase)
                        const { data, error } = await query.maybeSingle()
                        return { data, error }
                    },
                    async single() {
                        const query = this._buildQuery(supabase)
                        const { data, error } = await query.maybeSingle()
                        const dataItem = data ? data[0] || null : null
                        return { data: dataItem, error: error || (dataItem ? null : { message: 'Not found' }) }
                    },
                    then(cb: any) {
                        return Promise.resolve(cb(this))
                    }
                }

                builder._buildQuery = (client: any) => {
                    const _select = builder._select
                    const _where = builder._where
                    const _order = builder._order
                    const _limit = builder._limit
                    const _offset = builder._offset

                    let query = client.from(table).select(_select)

                    for (const w of _where) {
                        if (w.op === 'eq') query = query.eq(w.col, w.val)
                        else if (w.op === 'neq') query = query.neq(w.col, w.val)
                        else if (w.op === 'gt') query = query.gt(w.col, w.val)
                        else if (w.op === 'gte') query = query.gte(w.col, w.val)
                        else if (w.op === 'lt') query = query.lt(w.col, w.val)
                        else if (w.op === 'lte') query = query.lte(w.col, w.val)
                        else if (w.op === 'in') query = query.in(w.col, w.val)
                        else if (w.op === 'ilike') query = query.ilike(w.col, w.val)
                        else if (w.op === 'is') {
                            if (w.val === null) query = query.is(w.col, null)
                            else query = query.eq(w.col, w.val)
                        }
                    }

                    if (_order) {
                        query = query.order(_order.col, { ascending: _order.ascending })
                    }

                    if (_limit !== null) query = query.limit(_limit)
                    if (_offset !== null) query = query.offset(_offset)

                    return query
                }

                return builder
            },
            rpc: async (fn: string, params: any) => {
                const { data, error } = await supabase.rpc(fn, params)
                return { data, error }
            }
        }
    }
}
