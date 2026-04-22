const fs = require('fs');
const path = 'lib/tracking-service.ts';

const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

// Quota check code to insert (with proper indentation of 7 spaces)
const quotaCheck = [
  '',
  '      // 6.1 Supplier Quota Check (if supplier flow)',
  '      if (supplierId && ctx.supplierToken) {',
  '        const { data: link } = await db',
  '          .from(\'supplier_project_links\')',
  '          .select(\'id, quota_allocated, quota_used\')',
  '          .eq(\'supplier_id\', supplierId)',
  '          .eq(\'project_id\', project.id)',
  '          .eq(\'status\', \'active\')',
  '          .maybeSingle()',
  '',
  '        if (link) {',
  '          // Check quota: -1 = unlimited, 0 = blocked, positive = limit',
  '          if (link.quota_allocated > 0 && link.quota_used >= link.quota_allocated) {',
  '            await auditService.log({',
  '              event_type: \'QUOTA_EXCEEDED\',',
  '              payload: { ',
  '                project_id: project.id,',
  '                supplier_id: supplierId,',
  '                supplier_token: ctx.supplierToken,',
  '                quota_used: link.quota_used,',
  '                quota_allocated: link.quota_allocated',
  '              },',
  '              ip: ctx.ip,',
  '              user_agent: ctx.userAgent',
  '            })',
  '            return { success: false, errorType: \'QUOTA_FULL\', errorMessage: \'Supplier quota exhausted\', error: \'Quota full\' }',
  '          }',
  '        }',
  '      }'
];

// Insert after line 152 (index 151)
lines.splice(152, 0, ...quotaCheck);

// Now also add increment after response creation
// We need to find the line with "if (rError) throw rError" after response insert
let found = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (rError) throw rError') && i > 200) { // after response creation area
    // Insert increment before the audit log comment
    const increment = [
      '',
      '       // 10.1 Increment supplier quota (if supplier flow)',
      '       if (supplierId && ctx.supplierToken && response?.id) {',
      '         try {',
      '           await db',
      '             .from(\'supplier_project_links\')',
      '             .update({ quota_used: db.raw(\'quota_used + 1\') })',
      '             .eq(\'supplier_id\', supplierId)',
      '             .eq(\'project_id\', project.id)',
      '             .eq(\'status\', \'active\');',
      '           console.log(\'[Quota] Incremented quota for supplier \' + ctx.supplierToken + \' on project \' + project.project_code);',
      '         } catch (e) {',
      '           console.error(\'[Quota] Failed to increment:\', e.message);',
      '         }',
      '       }'
    ];
    lines.splice(i + 2, 0, ...increment); // after the blank line following throw
    found = true;
    break;
  }
}

if (!found) {
  console.error('❌ Could not find response error check line');
  process.exit(1);
}

fs.writeFileSync(path, lines.join('\n'));
console.log('✅ tracking-service.ts updated with quota logic');
