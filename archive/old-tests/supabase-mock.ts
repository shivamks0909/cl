/**
 * Mock Supabase client for unit testing
 * Mimics @supabase/supabase-js API surface
 */

type QueryBuilder = {
  select: (cols?: string) => QueryBuilder;
  insert: (data: any) => QueryBuilder;
  update: (data: any) => QueryBuilder;
  eq: (column: string, value: any) => QueryBuilder;
  single: () => QueryBuilder;
  execute: () => Promise<{ data: any; error: any }>;
};

type MockSupabaseClient = {
  from: (table: string) => QueryBuilder;
  auth: {
    getSession: () => Promise<{ data: any; error: any }>;
    signIn: (credentials: any) => Promise<{ data: any; error: any }>;
    signOut: () => Promise<{ error: any }>;
  };
  channel: (name: string) => any;
  removeChannel: (channel: any) => Promise<void>;
};

/**
 * Simple in-memory database for mock
 */
const mockData: Record<string, Array<Record<string, any>>> = {};

function resetMockData(): void {
  Object.keys(mockData).forEach(key => delete mockData[key]);
}

/**
 * Create a mock QueryBuilder
 */
function createQuery(table: string): QueryBuilder {
  let _data = mockData[table] || [];
  let _operation: 'select' | 'insert' | 'update' = 'select';
  let _insertData: any = null;
  let _updateData: any = null;
  let _filters: Array<{ column: string; value: any }> = [];
  let _single = false;

  const builder: QueryBuilder = {
    select: (cols = '*') => {
      _operation = 'select';
      return builder;
    },

    insert: (data: any) => {
      _operation = 'insert';
      _insertData = Array.isArray(data) ? data : [data];
      return builder;
    },

    update: (data: any) => {
      _operation = 'update';
      _updateData = data;
      return builder;
    },

    eq: (column: string, value: any) => {
      _filters.push({ column, value });
      return builder;
    },

    single: () => {
      _single = true;
      return builder;
    },

    execute: async () => {
      // Simulate network latency
      await new Promise(resolve => setTimeout(resolve, 10));

      try {
        if (_operation === 'select') {
          let result = [..._data];
          for (const filter of _filters) {
            result = result.filter(row => row[filter.column] == filter.value);
          }
          if (_single) {
            result = result.slice(0, 1);
          }
          return { data: result, error: null };
        }

        if (_operation === 'insert') {
          const inserted = _insertData.map(item => ({
            ...item,
            id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
          }));
          _data = [..._data, ...inserted];
          const returned = _single ? inserted[0] : inserted;
          return { data: returned, error: null };
        }

        if (_operation === 'update') {
          let updatedCount = 0;
          _data = _data.map(row => {
            let match = true;
            for (const filter of _filters) {
              if (row[filter.column] != filter.value) {
                match = false;
                break;
              }
            }
            if (match) {
              updatedCount++;
              return { ...row, ..._updateData, updated_at: new Date().toISOString() };
            }
            return row;
          });
          return { data: { affectedRows: updatedCount }, error: null };
        }

        return { data: null, error: new Error('Unknown operation') };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
  };

  return builder;
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabase(): MockSupabaseClient {
  resetMockData();

  return {
    from: (table: string) => {
      // Ensure mock data array exists
      if (!mockData[table]) {
        mockData[table] = [];
      }
      return createQuery(table);
    },

    auth: {
      getSession: async () => {
        return {
          data: {
            session: {
              access_token: 'mock_access_token',
              refresh_token: 'mock_refresh_token',
              user: { id: 'mock_user', email: 'test@example.com' },
            },
          },
          error: null,
        };
      },

      signIn: async (credentials: { email: string; password: string }) => {
        if (credentials.email === 'admin@opinioninsights.com' && credentials.password === 'admin123') {
          return {
            data: {
              session: {
                access_token: 'mock_admin_token',
                user: { id: 'admin_001', email: credentials.email, role: 'admin' },
              },
            },
            error: null,
          };
        }
        return { data: null, error: { message: 'Invalid credentials' } };
      },

      signOut: async () => {
        return { error: null };
      },
    },

    channel: (name: string) => {
      return {
        name,
        on: () => ({ unsubscribe: () => {} }),
        subscribe: () => ({ unsubscribe: () => {} }),
      };
    },

    removeChannel: async (channel: any) => {
      // noop
    },
  };
}

/**
 * Utility to seed mock data for a table (for test fixtures)
 */
export function seedMockData(table: string, records: Array<Record<string, any>>): void {
  if (!mockData[table]) {
    mockData[table] = [];
  }
  mockData[table].push(...records);
}

/**
 * Clear all mock data (clean slate)
 */
export function clearMockData(): void {
  resetMockData();
}
