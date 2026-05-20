const { Client } = require('pg');

const password = 'WnL4TDs1sSTFAJs7';
const projectRef = 'qvgrzxuonxhwnxitnfvk';
const regions = [
  'ap-south-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'sa-east-1',
  'ca-central-1'
];

async function tryRegion(region) {
  for (const prefix of ['aws-0', 'aws-1']) {
    const host = `${prefix}-${region}.pooler.supabase.com`;
    const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`;
    
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`\n🎉 SUCCESS! Connected to region: ${region} (${prefix})`);
      console.log(`Connection string: postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`);
      
      const res = await client.query('SELECT version()');
      console.log('Postgres:', res.rows[0].version);
      
      await client.end();
      process.exit(0);
    } catch (err) {
      if (err.message.includes('ENOTFOUND')) {
        // Host doesn't exist, ignore
      } else {
        console.log(`Region ${region} (${prefix}) host found, but error:`, err.message);
      }
    }
  }
}

async function findRegion() {
  console.log(`Starting scan for project ${projectRef} region (SSL fixed)...`);
  const promises = regions.map(r => tryRegion(r));
  await Promise.all(promises);
  console.log('Scan completed. No active region found.');
}

findRegion();
