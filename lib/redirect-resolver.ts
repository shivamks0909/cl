import { Project, Supplier, SupplierProjectLink } from './types';

export type RedirectResolution = {
    url: string;
    isExternal: boolean;
};

export class RedirectResolver {
    /**
     * Resolves the correct redirect or landing page URL based on project/vendor configuration.
     */
    static resolve(
        status: 'complete' | 'terminate' | 'quota_full',
        project: any | null,
        supplier: any | null,
        link: any | null,
        uid: string,
        pid: string,
        source?: string
    ): RedirectResolution {
        // Handle potential array from Supabase joins
        const s = Array.isArray(supplier) ? supplier[0] : supplier;
        const p = Array.isArray(project) ? project[0] : project;
        const l = Array.isArray(link) ? link[0] : link;

        // 1. Determine the status-specific key
        let redirectKey: 'complete' | 'terminate' | 'quotafull' = 'complete';
        if (status === 'terminate') redirectKey = 'terminate';
        if (status === 'quota_full') redirectKey = 'quotafull';

        // 2. Priority Resolution
        let targetUrl: string | null = null;
        let isExternal = false;

        const isSupplierFlow = source === 'supplier' || source === 'vendor' || !!s;

        // Priority 1: Link-level specific redirect (Only for supplier flow)
        if (isSupplierFlow && l) {
            const linkCustomUrl = l[`custom_${redirectKey}_url` as keyof SupplierProjectLink] as string;
            if (linkCustomUrl) {
                targetUrl = linkCustomUrl;
                isExternal = true;
            }
        }

        // Priority 2: Vendor-level specific redirect (Only for supplier flow)
        if (isSupplierFlow && !targetUrl && s) {
            const supplierUrl = s[`${redirectKey}_redirect_url` as keyof Supplier] as string;
            if (supplierUrl) {
                targetUrl = supplierUrl;
                isExternal = true;
            }
        }

        // Priority 3: Link-level landing page override (Only for supplier flow)
        if (isSupplierFlow && !targetUrl && l?.custom_landing_page_url) {
            targetUrl = l.custom_landing_page_url;
            isExternal = targetUrl!.startsWith('http');
        }

        // Priority 4: Vendor-level landing page override (Only for supplier flow)
        if (isSupplierFlow && !targetUrl && s?.landing_page_url) {
            targetUrl = s.landing_page_url;
            isExternal = targetUrl!.startsWith('http');
        }

        // Priority 5: Project-level landing page (Available for ALL flows)
        if (!targetUrl && p?.project_landing_page_url) {
            targetUrl = p.project_landing_page_url;
            isExternal = targetUrl!.startsWith('http');
        }

        // Final Fallback: Platform Default
        if (!targetUrl) {
            targetUrl = `/${redirectKey === 'quotafull' ? 'quotafull' : redirectKey}`;
            isExternal = false;
        }

        // Apply parameter replacement if external
        if (isExternal && targetUrl) {
            targetUrl = this.injectParams(targetUrl, uid, pid, supplier, status);
        }

        return {
            url: targetUrl,
            isExternal
        };
    }

    /**
     * Replaces placeholders like {uid}, {pid}, {status}, [UID], [PID] with actual values.
     * Also handles vendor-specific parameter mapping.
     */
    private static injectParams(url: string, uid: string, pid: string, supplier: Supplier | null, status?: string): string {
        let finalUrl = url;
        
        // Internal placeholders (order matters: longer patterns first to avoid partial replacement)
        const replacements: Record<string, string> = {
            '{{uid}}': uid,
            '{{pid}}': pid,
            '{{status}}': status || '',
            '{uid}': uid,
            '{pid}': pid,
            '{status}': status || '',
            '[UID]': uid,
            '[PID]': pid,
            '[uid]': uid,
            '[pid]': pid,
        };

        Object.entries(replacements).forEach(([key, val]) => {
            finalUrl = finalUrl.split(key).join(encodeURIComponent(val));
        });

        // Vendor-specific parameter mapping (Append if not present)
        try {
            const urlObj = new URL(finalUrl);
            const uidParam = supplier?.uid_param_name || 'uid';
            const pidParam = supplier?.pid_param_name || 'pid';

            if (!urlObj.searchParams.has(uidParam)) {
                urlObj.searchParams.set(uidParam, uid);
            }
            if (!urlObj.searchParams.has(pidParam)) {
                urlObj.searchParams.set(pidParam, pid);
            }
            
            return urlObj.toString();
        } catch (e) {
            // Fallback for malformed URLs
            if (!finalUrl.includes('?')) finalUrl += '?';
            const uidParam = supplier?.uid_param_name || 'uid';
            if (!finalUrl.includes(`${uidParam}=`)) {
                finalUrl += `${finalUrl.endsWith('?') ? '' : '&'}${uidParam}=${encodeURIComponent(uid)}`
            }
            return finalUrl;
        }
    }

    /**
     * Normalizes a UID from various potential aliases.
     */
    static normalizeUid(params: Record<string, string>, supplier: Supplier | null): string | null {
        const aliases = supplier?.respondent_id_aliases || ['uid', 'id', 'rid', 'respondent_id'];
        
        // Try vendor-specific primary param first
        if (supplier?.uid_param_name && params[supplier.uid_param_name]) {
            return params[supplier.uid_param_name];
        }

        // Try aliases
        for (const alias of aliases) {
            if (params[alias]) return params[alias];
        }

        return params.uid || params.id || params.rid || null;
    }
}
