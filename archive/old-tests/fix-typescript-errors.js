const fs = require('fs');
const path = 'lib/tracking-service.ts';

let code = fs.readFileSync(path, 'utf8');

// Fix 1: Remove duplicate increment block (keep only the first one)
const firstIncrement = `        // 10.1 Increment supplier quota (if supplier flow)\n        if (supplierId && ctx.supplierToken && response?.id) {\n          try {\n            await db\n              .from('supplier_project_links')\n              .update({ quota_used: db.raw('quota_used + 1') })\n              .eq('supplier_id', supplierId)\n              .eq('project_id', project.id)\n              .eq('status', 'active');\n            console.log('[Quota] Incremented quota for supplier ' + ctx.supplierToken + ' on project ' + project.project_code);\n          } catch (e) {\n            console.error('[Quota] Failed to increment:', e.message);\n          }\n        }`;

// Find all occurrences
const regex = new RegExp(escapeRegExp(firstIncrement), 'g');
const matches = code.match(regex);
if (matches && matches.length > 1) {
  // Remove the second occurrence
  const firstIdx = code.indexOf(firstIncrement);
  const secondIdx = code.indexOf(firstIncrement, firstIdx + 1);
  if (secondIdx !== -1) {
    code = code.substring(0, secondIdx) + code.substring(secondIdx + firstIncrement.length);
    console.log('✅ Removed duplicate increment block');
  }
}

// Fix 2: Replace db.raw with a type-safe approach using PostgREST's count=exact or use a different method
// Actually, we can use db.raw with type assertion: (db as any).raw(...)
// But better: fetch and update in two steps to avoid raw SQL
// Let's replace the increment block with a safer version that doesn't use db.raw

const safeIncrement = `        // 10.1 Increment supplier quota (if supplier flow)
        if (supplierId && ctx.supplierToken && response?.id) {
          try {
            // Get current quota_used
            const { data: linkData } = await db
              .from('supplier_project_links')
              .select('quota_used')
              .eq('supplier_id', supplierId)
              .eq('project_id', project.id)
              .eq('status', 'active')
              .maybeSingle();

            if (linkData) {
              await db
                .from('supplier_project_links')
                .update({ quota_used: (linkData.quota_used || 0) + 1 })
                .eq('supplier_id', supplierId)
                .eq('project_id', project.id)
                .eq('status', 'active');
              console.log('[Quota] Incremented quota for supplier ' + ctx.supplierToken + ' on project ' + project.project_code + ' (now ' + ((linkData.quota_used || 0) + 1) + ')');
            }
          } catch (e: any) {
            console.error('[Quota] Failed to increment:', e.message);
          }
        }`;

// Replace the first (and only) increment block with safe version
if (code.includes(firstIncrement)) {
  code = code.replace(firstIncrement, safeIncrement);
  console.log('✅ Replaced increment with safe version');
}

// Fix 3: Also need to adjust the quota check to use proper error typing
// The quota check already uses return with proper type, that's fine.

fs.writeFileSync(path, code);
console.log('✅ tracking-service.ts TypeScript errors fixed');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
