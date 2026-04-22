const fs = require('fs');
const path = 'lib/tracking-service.ts';

let code = fs.readFileSync(path, 'utf8');

// Markers
const startMarker = '      if (rError) throw rError';
const endMarker = '      // 11. Audit Log ';

const startIdx = code.indexOf(startMarker);
if (startIdx === -1) {
  console.error('❌ Start marker not found');
  process.exit(1);
}

const endIdx = code.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.error('❌ End marker not found');
  process.exit(1);
}

console.log('Found section from', startIdx, 'to', endIdx);

const before = code.substring(0, startIdx + startMarker.length);
const after = code.substring(endIdx);

const cleanIncrement = '\n\n       // 10.1 Increment supplier quota (if supplier flow)\n       if (supplierId && ctx.supplierToken && response?.id) {\n         try {\n           // Get current quota_used\n           const { data: linkData } = await db\n             .from(\'supplier_project_links\')\n             .select(\'quota_used\')\n             .eq(\'supplier_id\', supplierId)\n             .eq(\'project_id\', project.id)\n             .eq(\'status\', \'active\')\n             .maybeSingle();\n\n           if (linkData) {\n             await db\n               .from(\'supplier_project_links\')\n               .update({ quota_used: (linkData.quota_used || 0) + 1 })\n               .eq(\'supplier_id\', supplierId)\n               .eq(\'project_id\', project.id)\n               .eq(\'status\', \'active\');\n             console.log(\'[Quota] Incremented quota for supplier \' + ctx.supplierToken + \' on project \' + project.project_code);\n           }\n         } catch (e: any) {\n           console.error(\'[Quota] Failed to increment:\', e.message);\n         }\n       }\n\n       // 11. Audit Log ';

code = before + cleanIncrement + after;
fs.writeFileSync(path, code);
console.log('✅ tracking-service.ts cleaned and fixed');
