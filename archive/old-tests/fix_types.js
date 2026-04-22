const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.hhonnqntmfjheyeneain:4SeOvHNJdcyKY28n@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres'
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // Change clickid from uuid to text in responses
        // We drop the default first to avoid issues
        await client.query(`
      ALTER TABLE responses ALTER COLUMN clickid DROP DEFAULT;
      ALTER TABLE responses ALTER COLUMN clickid TYPE text USING clickid::text;
    `);

        // Change clickid from uuid to text in callback_events
        await client.query(`
      ALTER TABLE callback_events ALTER COLUMN clickid TYPE text USING clickid::text;
    `);

        console.log('Successfully changed clickid columns to TEXT!');
    } catch (e) {
        console.error('Alter Failed:', e.message);
    } finally {
        await client.end();
    }
}

run();
