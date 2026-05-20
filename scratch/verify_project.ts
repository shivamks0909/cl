import { getDb } from '../lib/db'

function verify() {
  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE project_code = ?').get('QC_4343234227682')
  console.log('Project in local SQLite database:', JSON.stringify(project, null, 2))
}

verify()
