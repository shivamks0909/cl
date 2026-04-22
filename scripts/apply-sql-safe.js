const { Client } = require('pg');
require('dotenv').config();

// Extract connection string from InsForge URL or similar
// For this environment, we use the unified-db approach
async function run() {
    console.log('Starting SQL update...');
    try {
        const { getUnifiedDb } = require('./lib/unified-db');
        const { database: db } = await getUnifiedDb();
        
        if (!db) {
             console.error('Database connection failed');
             return;
        }

        const sqlKPI = `
        CREATE OR REPLACE FUNCTION get_kpis()
        RETURNS JSON AS $$
        DECLARE
            today DATE := CURRENT_DATE;
            result JSON;
        BEGIN
            SELECT json_build_object(
                'total_projects', (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL),
                'active_projects', (SELECT COUNT(*) FROM projects WHERE status = 'active' AND deleted_at IS NULL),
                'total_clicks_today', (SELECT COUNT(*) FROM responses WHERE created_at::DATE = today),
                'clicks_today', (SELECT COUNT(*) FROM responses WHERE created_at::DATE = today),
                'direct_clicks_today', (SELECT COUNT(*) FROM responses WHERE source = 'direct' AND created_at::DATE = today),
                'supplier_clicks_today', (SELECT COUNT(*) FROM responses WHERE source != 'direct' AND created_at::DATE = today),
                'total_responses', (SELECT COUNT(*) FROM responses),
                'total_completes_today', (SELECT COUNT(*) FROM responses WHERE status = 'complete' AND created_at::DATE = today),
                'completes_today', (SELECT COUNT(*) FROM responses WHERE status = 'complete' AND created_at::DATE = today),
                'direct_completes_today', (SELECT COUNT(*) FROM responses WHERE status = 'complete' AND source = 'direct' AND created_at::DATE = today),
                'supplier_completes_today', (SELECT COUNT(*) FROM responses WHERE status = 'complete' AND source != 'direct' AND created_at::DATE = today),
                'terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'terminate' AND created_at::DATE = today),
                'quotafull_today', (SELECT COUNT(*) FROM responses WHERE status IN ('quota_full', 'quota') AND created_at::DATE = today),
                'in_progress_today', (SELECT COUNT(*) FROM responses WHERE status = 'in_progress' AND created_at::DATE = today),
                'duplicates_today', (SELECT COUNT(*) FROM responses WHERE status IN ('duplicate_ip', 'duplicate_string') AND created_at::DATE = today),
                'security_terminates_today', (SELECT COUNT(*) FROM responses WHERE status = 'security_terminate' AND created_at::DATE = today)
            ) INTO result;
            RETURN result;
        END;
        $$ LANGUAGE plpgsql;
        `;

        const sqlAnalytics = `
        CREATE OR REPLACE FUNCTION get_project_analytics()
        RETURNS TABLE (
            project_id UUID,
            project_code TEXT,
            project_name TEXT,
            status TEXT,
            clicks BIGINT,
            completes BIGINT,
            direct_completes BIGINT,
            supplier_completes BIGINT,
            terminates BIGINT,
            quota_full BIGINT,
            conversion_rate NUMERIC
        ) AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                p.id as project_id,
                p.project_code::TEXT,
                p.project_name::TEXT,
                p.status::TEXT,
                COUNT(r.id)::BIGINT as clicks,
                COUNT(r.id) FILTER (WHERE r.status = 'complete')::BIGINT as completes,
                COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.source = 'direct')::BIGINT as direct_completes,
                COUNT(r.id) FILTER (WHERE r.status = 'complete' AND r.source != 'direct')::BIGINT as supplier_completes,
                COUNT(r.id) FILTER (WHERE r.status = 'terminate')::BIGINT as terminates,
                COUNT(r.id) FILTER (WHERE r.status IN ('quota_full', 'quota'))::BIGINT as quota_full,
                CASE 
                    WHEN COUNT(r.id) > 0 THEN (COUNT(r.id) FILTER (WHERE r.status = 'complete')::NUMERIC / COUNT(r.id)::NUMERIC) * 100
                    ELSE 0 
                END as conversion_rate
            FROM projects p
            LEFT JOIN responses r ON p.id = r.project_id
            WHERE p.deleted_at IS NULL
            GROUP BY p.id, p.project_code, p.project_name, p.status;
        END;
        $$ LANGUAGE plpgsql;
        `;

        // Execution via SDK runRawSql if available, or fetch
        // Since we are in the workspace, we can use the insforge-server admin client
        const { createAdminClient } = require('./lib/insforge-server');
        const admin = await createAdminClient();
        if (admin) {
            console.log('Found admin client, executing...');
            await admin.database.rpc('run_raw_sql', { sql: sqlKPI }); // Assuming run_raw_sql helper exists
            // If not, we use the import method but via a child process of a simpler file
        }

    } catch (e) {
        console.error(e);
    }
}

run();
