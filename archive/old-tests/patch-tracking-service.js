const fs = require('fs');
const path = 'lib/tracking-service.ts';

let code = fs.readFileSync(path, 'utf8');

// Insertion 1: Quota check after supplier identification
const insertAfter = `      }\r\n\r\n      // Determine final destination URL`;
const quotaCheck = `      }\r\n\r\n      // 6.1 Supplier Quota Check (if supplier flow)\r\n      if (supplierId && ctx.supplierToken) {\r\n        const { data: link } = await db\r\n          .from('supplier_project_links')\r\n          .select('id, quota_allocated, quota_used')\r\n          .eq('supplier_id', supplierId)\r\n          .eq('project_id', project.id)\r\n          .eq('status', 'active')\r\n          .maybeSingle()\r\n\r\n        if (link) {\r\n          // Check quota: -1 = unlimited, 0 = blocked, positive = limit\r\n          if (link.quota_allocated > 0 && link.quota_used >= link.quota_allocated) {\r\n            await auditService.log({\r\n              event_type: 'QUOTA_EXCEEDED',\r\n              payload: { \r\n                project_id: project.id,\r\n                supplier_id: supplierId,\r\n                supplier_token: ctx.supplierToken,\r\n                quota_used: link.quota_used,\r\n                quota_allocated: link.quota_allocated\r\n              },\r\n              ip: ctx.ip,\r\n              user_agent: ctx.userAgent\r\n            })\r\n            return { success: false, errorType: 'QUOTA_FULL', errorMessage: 'Supplier quota exhausted', error: 'Quota full' }\r\n          }\r\n        }\r\n      }\r\n\r\n      // Determine final destination URL`;

if (code.includes(insertAfter)) {
  code = code.replace(insertAfter, quotaCheck);
  console.log('✅ Inserted quota check');
} else {
  console.error('❌ Could not find first insertion point');
  process.exit(1);
}

// Insertion 2: Increment quota after response creation, before audit log
const beforeAudit = `       if (rError) throw rError\r\n\r\n       // 11. Audit Log `;
const afterResponse = `       if (rError) throw rError\r\n\r\n       // 10.1 Increment supplier quota (if supplier flow)\r\n       if (supplierId && ctx.supplierToken && response?.id) {\r\n         try {\r\n           await db\r\n             .from('supplier_project_links')\r\n             .update({ quota_used: db.raw('quota_used + 1') })\r\n             .eq('supplier_id', supplierId)\r\n             .eq('project_id', project.id)\r\n             .eq('status', 'active');\r\n           console.log('[Quota] Incremented quota for supplier ' + ctx.supplierToken + ' on project ' + project.project_code);\r\n         } catch (e) {\r\n           console.error('[Quota] Failed to increment:', e.message);\r\n         }\r\n       }\r\n\r\n       // 11. Audit Log `;

if (code.includes(beforeAudit)) {
  code = code.replace(beforeAudit, afterResponse);
  console.log('✅ Inserted quota increment');
} else {
  console.error('❌ Could not find second insertion point');
  process.exit(1);
}

fs.writeFileSync(path, code);
console.log('✅ tracking-service.ts updated successfully');
