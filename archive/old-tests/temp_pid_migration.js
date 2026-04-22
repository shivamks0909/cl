const { Client } = require('pg');

async function migrate() {
    const client = new Client({
        connectionString: 'postgresql://postgres.czzbduzmwzoumgzfryou:WnL4TDs1sSTFAJs7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const query = `
      -- 1. Add PID configuration to projects
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS pid_prefix TEXT,
      ADD COLUMN IF NOT EXISTS pid_counter INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS pid_padding INTEGER DEFAULT 2;

      -- 2. Add client_pid to responses
      ALTER TABLE responses 
      ADD COLUMN IF NOT EXISTS client_pid TEXT;

      -- 3. Create Atomic PID Generation Function
      CREATE OR REPLACE FUNCTION fn_generate_next_client_pid(target_project_id UUID)
      RETURNS TEXT AS $$
      DECLARE
          seq_val INTEGER;
          prefix_val TEXT;
          padding_val INTEGER;
          formatted_pid TEXT;
      BEGIN
          -- Select and lock the project row
          SELECT pid_prefix, pid_counter, pid_padding 
          INTO prefix_val, seq_val, padding_val
          FROM projects 
          WHERE id = target_project_id
          FOR UPDATE;

          IF prefix_val IS NULL THEN
              RETURN NULL;
          END IF;

          -- Format: Prefix + Padded Number (e.g. OPGH + 01)
          formatted_pid := prefix_val || LPAD(seq_val::TEXT, padding_val, '0');

          -- Increment counter for next time
          UPDATE projects 
          SET pid_counter = pid_counter + 1 
          WHERE id = target_project_id;

          RETURN formatted_pid;
      END;
      $$ LANGUAGE plpgsql;
    `;

        await client.query(query);
        console.log('Migration successful: PID columns and function added.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();

