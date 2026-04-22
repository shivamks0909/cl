const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
    // 1. Create a dummy supplier
    const { data: supplier, error: err1 } = await supabase.from('suppliers').upsert({
        supplier_token: 'DELTEST',
        name: 'DeleteTest',
        status: 'active'
    }, { onConflict: 'supplier_token' }).select().single();

    console.log("Created supplier:", supplier?.id, err1?.message);

    // 2. Delete the supplier using exactly what dashboardService does
    const { error: unlinkError } = await supabase.from('supplier_project_links').delete().eq('supplier_id', supplier.id);
    console.log("Unlink result:", unlinkError?.message || "Success");

    const { error: delError } = await supabase.from('suppliers').delete().eq('id', supplier.id);
    console.log("Delete result:", delError?.message || "Success");

    if (delError && delError.code === '23503') {
        const { error: fallbackError } = await supabase.from('suppliers').update({ status: 'paused' }).eq('id', supplier.id);
        console.log("Fallback result:", fallbackError?.message || "Success");
    }
}

testDelete().catch(console.error);
