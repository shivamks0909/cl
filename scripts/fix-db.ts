import { config } from "dotenv";
config({ path: [".env", ".env.local"], override: true });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log("Checking tracking_sessions table...");
  try {
    await supabase.from("tracking_sessions").select("id").limit(1);
    console.log("✅ tracking_sessions table exists");
  } catch (e: any) {
    if (e.message?.includes("relation") && e.message?.includes("does not exist")) {
      console.log("❌ tracking_sessions table missing. Please run migration: scripts/migrate-session-tracking.sql");
    } else {
      console.log("Table check error:", e.message);
    }
  }

  console.log("\nChecking DYNAMIC_ENTRY project...");
  const { data: proj } = await supabase.from("projects").select("id, status").eq("project_code", "DYNAMIC_ENTRY").single();
  
  if (proj) {
    if (proj.status !== "active") {
      await supabase.from("projects").update({ status: "active" }).eq("id", proj.id);
      console.log("✅ Activated DYNAMIC_ENTRY project");
    } else {
      console.log("✅ DYNAMIC_ENTRY already active");
    }
  } else {
    await supabase.from("projects").insert([{
      project_code: "DYNAMIC_ENTRY",
      project_name: "Dynamic Entry Fallback",
      base_url: "https://example.com",
      status: "active"
    }]);
    console.log("✅ Created DYNAMIC_ENTRY fallback project");
  }

  const { data: all } = await supabase.from("projects").select("project_code, status").limit(10);
  console.log("\nCurrent projects:");
  all?.forEach((p: any) => console.log(`  ${p.project_code}: ${p.status}`));
}

fix().catch(console.error);