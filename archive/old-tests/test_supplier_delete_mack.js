const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDeleteMakc() {
    const { data: supplier } = await supabase.from('suppliers').select('id').eq('supplier_token', 'MACK').single();
    if (!supplier) {
        console.log("MACK not found");
        return;
    }

    const { error: unlinkError } = await supabase.from('supplier_project_links').delete().eq('supplier_id', supplier.id);
    console.log("Unlink MACK result:", unlinkError?.message || "Success");

    const { error: delError } = await supabase.from('suppliers').delete().eq('id', supplier.id);
    console.log("Delete MACK result:", delError?.message || "Success", delError?.code);

    if (delError && delError.code === '23503') {
        const { error: fallbackError } = await supabase.from('suppliers').update({ status: 'paused' }).eq('id', supplier.id);
        console.log("Fallback MACK result:", fallbackError?.message || "Success");
    }
}

testDeleteMakc().catch(console.error);
