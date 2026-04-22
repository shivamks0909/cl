const fs = require('fs');
const path = 'lib/tracking-service.ts';

let code = fs.readFileSync(path, 'utf8');

// Exact pattern with 6 spaces before if and 6 before //
const beforeAudit = `\r\n\r\n      if (rError) throw rError\r\n\r\n      // 11. Audit Log `;
const afterResponse = `\r\n\r\n      if (rError) throw rError\r\n\r\n       // 10.1 Increment supplier quota (if supplier flow)\r\n       if (supplierId && ctx.supplierToken && response?.id) {\r\n         try {\r\n           await db\r\n             .from('supplier_project_links')\r\n             .update({ quota_used: db.raw('quota_used + 1') })\r\n             .eq('supplier_id', supplierId)\r\n             .eq('project_id', project.id)\r\n             .eq('status', 'active');\r\n           console.log('[Quota] Incremented quota for supplier ' + ctx.supplierToken + ' on project ' + project.project_code);\r\n         } catch (e) {\r\n           console.error('[Quota] Failed to increment:', e.message);\r\n         }\r\n       }\r\n\r\n      // 11. Audit Log `;

if (code.includes(beforeAudit)) {
  code = code.replace(beforeAudit, afterResponse);
  console.log('✅ Inserted quota increment');
  fs.writeFileSync(path, code);
  process.exit(0);
} else {
  console.error('❌ Pattern not found');
  process.exit(1);
}
