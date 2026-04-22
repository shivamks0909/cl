import { RedirectResolver } from '../../../lib/redirect-resolver';
import { Project, Supplier, SupplierProjectLink } from '../../../lib/types';

describe('RedirectResolver', () => {
  describe('resolve()', () => {
    const baseUid = 'TEST_UID_123';
    const basePid = 'TEST_PROJECT';
    const mockSupplier: Supplier = {
      id: 'supp-001',
      name: 'Test Supplier',
      supplier_token: 'TEST_SUPP',
      status: 'active',
      complete_redirect_url: 'https://supplier.example.com/complete?pid={pid}&uid={uid}',
      terminate_redirect_url: 'https://supplier.example.com/terminate',
      quotafull_redirect_url: 'https://supplier.example.com/quotafull?pid={pid}&uid={uid}',
      landing_page_url: 'https://supplier.example.com/landing',
      uid_param_name: 'uid',
      pid_param_name: 'pid',
      respondent_id_aliases: ['uid', 'id', 'rid'],
      created_at: new Date().toISOString(),
    };

    const mockLink: SupplierProjectLink = {
      id: 'link-001',
      supplier_id: 'supp-001',
      project_id: 'proj-001',
      status: 'active',
      quota_allocated: -1,
      quota_used: 0,
      custom_complete_url: null,
      custom_terminate_url: null,
      custom_quotafull_url: null,
      custom_landing_page_url: null,
      created_at: new Date().toISOString(),
    };

    describe('Direct Flow (source not supplier)', () => {
      const projectWithoutLanding: Project = {
        id: 'proj-001',
        project_code: basePid,
        project_name: 'Test Project',
        project_landing_page_url: null,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      it('should resolve complete status to internal /complete', () => {
        const result = RedirectResolver.resolve(
          'complete',
          projectWithoutLanding,
          null,
          null,
          baseUid,
          basePid,
          'direct'
        );

        expect(result.url).toBe('/complete');
        expect(result.isExternal).toBe(false);
      });

      it('should resolve terminate status to internal /terminate', () => {
        const result = RedirectResolver.resolve(
          'terminate',
          projectWithoutLanding,
          null,
          null,
          baseUid,
          basePid,
          'direct'
        );

        expect(result.url).toBe('/terminate');
        expect(result.isExternal).toBe(false);
      });

      it('should resolve quota_full status to internal /quotafull', () => {
        const result = RedirectResolver.resolve(
          'quota_full',
          projectWithoutLanding,
          null,
          null,
          baseUid,
          basePid,
          'direct'
        );

        expect(result.url).toBe('/quotafull');
        expect(result.isExternal).toBe(false);
      });

      it('should use project landing page if configured (external URL with injection)', () => {
        const projectWithExternalLanding: Project = {
          ...projectWithoutLanding,
          project_landing_page_url: 'https://panelflow.com/thanks',
        };

        const result = RedirectResolver.resolve(
          'complete',
          projectWithExternalLanding,
          null,
          null,
          baseUid,
          basePid,
          'direct'
        );

        // Since external, UID and PID should be injected as query params
        expect(result.url).toContain('https://panelflow.com/thanks');
        expect(result.url).toContain(`uid=${encodeURIComponent(baseUid)}`);
        expect(result.url).toContain(`pid=${encodeURIComponent(basePid)}`);
        expect(result.isExternal).toBe(true);
      });

      it('should use project landing page if configured (internal URL, no injection)', () => {
        const projectWithInternalLanding: Project = {
          ...projectWithoutLanding,
          project_landing_page_url: '/internal/complete',
        };

        const result = RedirectResolver.resolve(
          'complete',
          projectWithInternalLanding,
          null,
          null,
          baseUid,
          basePid,
          'direct'
        );

        expect(result.url).toBe('/internal/complete');
        expect(result.isExternal).toBe(false);
      });
    });

    describe('Supplier Flow (source = supplier or vendor)', () => {
      const project: Project = {
        id: 'proj-001',
        project_code: basePid,
        project_name: 'Test Project',
        project_landing_page_url: null,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      it('should use supplier complete_redirect_url for complete status', () => {
        const result = RedirectResolver.resolve(
          'complete',
          project,
          mockSupplier,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        // The URL should contain the supplier's base with injected uid/pid
        expect(result.url).toContain('https://supplier.example.com/complete');
        expect(result.url).toContain(`uid=${encodeURIComponent(baseUid)}`);
        expect(result.url).toContain(`pid=${encodeURIComponent(basePid)}`);
        expect(result.isExternal).toBe(true);
      });

      it('should use supplier terminate_redirect_url for terminate status', () => {
        const result = RedirectResolver.resolve(
          'terminate',
          project,
          mockSupplier,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        // The terminate URL is a static string; after injection, uid and pid may be appended as query params
        expect(result.url).toContain('https://supplier.example.com/terminate');
        // The injection adds uid/pid if not present
        expect(result.url).toContain(`uid=${encodeURIComponent(baseUid)}`);
        expect(result.url).toContain(`pid=${encodeURIComponent(basePid)}`);
        expect(result.isExternal).toBe(true);
      });

      it('should use supplier quotafull_redirect_url for quota_full status', () => {
        const result = RedirectResolver.resolve(
          'quota_full',
          project,
          mockSupplier,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        expect(result.url).toContain('https://supplier.example.com/quotafull');
        expect(result.url).toContain(`uid=${encodeURIComponent(baseUid)}`);
        expect(result.url).toContain(`pid=${encodeURIComponent(basePid)}`);
        expect(result.isExternal).toBe(true);
      });

      it('should prioritize link-level custom_complete_url over supplier-level', () => {
        const linkWithCustom: SupplierProjectLink = {
          ...mockLink,
          custom_complete_url: 'https://custom.example.com/complete',
        };

        const result = RedirectResolver.resolve(
          'complete',
          project,
          mockSupplier,
          linkWithCustom,
          baseUid,
          basePid,
          'supplier'
        );

        expect(result.url).toContain('https://custom.example.com/complete');
        // Should still have uid/pid injected if not present
        expect(result.url).toContain(`uid=${encodeURIComponent(baseUid)}`);
        expect(result.url).toContain(`pid=${encodeURIComponent(basePid)}`);
      });

      it('should use supplier landing_page_url if no specific redirect for status', () => {
        const supplierNoRedirects: Supplier = {
          ...mockSupplier,
          complete_redirect_url: null,
          terminate_redirect_url: null,
          quotafull_redirect_url: null,
          landing_page_url: 'https://supplier.example.com/general',
        };

        const result = RedirectResolver.resolve(
          'complete',
          project,
          supplierNoRedirects,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        expect(result.url).toBe('https://supplier.example.com/general?uid=TEST_UID_123&pid=TEST_PROJECT');
        expect(result.isExternal).toBe(true);
      });

      it('should fall back to project landing page if supplier has no config and project has landing', () => {
        const supplierMinimal: Supplier = {
          ...mockSupplier,
          complete_redirect_url: null,
          landing_page_url: null,
        };

        const projectWithLanding: Project = {
          ...project,
          project_landing_page_url: 'https://panelflow.com/fallback',
        };

        const result = RedirectResolver.resolve(
          'complete',
          projectWithLanding,
          supplierMinimal,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        expect(result.url).toContain('https://panelflow.com/fallback');
        expect(result.isExternal).toBe(true);
      });

      it('should fall back to default internal page if no config at all', () => {
        const supplierMinimal: Supplier = {
          ...mockSupplier,
          complete_redirect_url: null,
          landing_page_url: null,
        };

        const projectWithoutLanding: Project = {
          ...project,
          project_landing_page_url: null,
        };

        const result = RedirectResolver.resolve(
          'complete',
          projectWithoutLanding,
          supplierMinimal,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        // Even for supplier flow, final fallback is internal /complete
        expect(result.url).toBe('/complete');
        expect(result.isExternal).toBe(false);
      });
    });

    describe('Parameter Injection', () => {
      const project: Project = {
        id: 'proj-001',
        project_code: basePid,
        project_name: 'Test Project',
        project_landing_page_url: null,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const supplier: Supplier = {
        ...mockSupplier,
        complete_redirect_url: null,
        landing_page_url: 'https://example.com/landing',
      };

      it('should inject {uid} and {pid} placeholders', () => {
        const supplierWithPlaceholders: Supplier = {
          ...supplier,
          landing_page_url: 'https://example.com/complete?uid={uid}&pid={pid}&status={status}',
        };

        const result = RedirectResolver.resolve(
          'complete',
          project,
          supplierWithPlaceholders,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        const url = new URL(result.url);
        expect(url.searchParams.get('uid')).toBe(baseUid);
        expect(url.searchParams.get('pid')).toBe(basePid);
        expect(url.searchParams.get('status')).toBe('complete');
      });

      it('should inject [UID] and [PID] bracket notation', () => {
        const supplierWithBrackets: Supplier = {
          ...supplier,
          landing_page_url: 'https://example.com/complete?uid=[UID]&pid=[PID]',
        };

        const result = RedirectResolver.resolve(
          'complete',
          project,
          supplierWithBrackets,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        const url = new URL(result.url);
        expect(url.searchParams.get('uid')).toBe(baseUid);
        expect(url.searchParams.get('pid')).toBe(basePid);
      });

      it('should inject [uid] and [pid] lowercase brackets', () => {
        const supplierWithBracketsLower: Supplier = {
          ...supplier,
          landing_page_url: 'https://example.com/complete?uid=[uid]&pid=[pid]',
        };

        const result = RedirectResolver.resolve(
          'complete',
          project,
          supplierWithBracketsLower,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        const url = new URL(result.url);
        expect(url.searchParams.get('uid')).toBe(baseUid);
        expect(url.searchParams.get('pid')).toBe(basePid);
      });

      it('should inject {{uid}} and {{pid}} double brace notation (fixed order bug)', () => {
        const supplierWithDoubleBraces: Supplier = {
          ...supplier,
          landing_page_url: 'https://example.com/complete?uid={{uid}}&pid={{pid}}',
        };

        const result = RedirectResolver.resolve(
          'complete',
          project,
          supplierWithDoubleBraces,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        const url = new URL(result.url);
        expect(url.searchParams.get('uid')).toBe(baseUid);
        expect(url.searchParams.get('pid')).toBe(basePid);
      });

      it('should respect vendor-specific uid_param_name and pid_param_name', () => {
        const supplierCustomParams: Supplier = {
          ...supplier,
          landing_page_url: 'https://example.com/complete',
          uid_param_name: 'respondent_id',
          pid_param_name: 'project_code',
        };

        const result = RedirectResolver.resolve(
          'complete',
          project,
          supplierCustomParams,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        const url = new URL(result.url);
        expect(url.searchParams.get('respondent_id')).toBe(baseUid);
        expect(url.searchParams.get('project_code')).toBe(basePid);
      });

      it('should not duplicate parameters if already present in URL', () => {
        const supplierWithExisting: Supplier = {
          ...supplier,
          landing_page_url: `https://example.com/complete?uid=${encodeURIComponent(baseUid)}&extra=val`,
        };

        const result = RedirectResolver.resolve(
          'complete',
          project,
          supplierWithExisting,
          mockLink,
          baseUid,
          basePid,
          'supplier'
        );

        const url = new URL(result.url);
        const uidParams = url.searchParams.getAll('uid');
        expect(uidParams.length).toBe(1);
        expect(url.searchParams.get('uid')).toBe(baseUid);
        expect(url.searchParams.get('extra')).toBe('val');
      });
    });

    describe('Edge Cases', () => {
      const project: Project = {
        id: 'proj-001',
        project_code: 'TEST_PROJECT',
        project_name: 'Test Project',
        project_landing_page_url: null,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      it('should handle null supplier', () => {
        const result = RedirectResolver.resolve(
          'complete',
          project,
          null,
          null,
          'UID',
          'PID',
          'direct'
        );

        expect(result.url).toBe('/complete');
        expect(result.isExternal).toBe(false);
      });

      it('should handle supplier as array (first element)', () => {
        const supplierArray = [mockSupplier];
        const result = RedirectResolver.resolve(
          'complete',
          project,
          supplierArray,
          null,
          'UID',
          'PID',
          'supplier'
        );

        // MockSupplier has complete_redirect_url, so it should use that
        expect(result.url).toContain('https://supplier.example.com/complete');
        expect(result.isExternal).toBe(true);
      });

      it('should treat source = "vendor" as supplier flow', () => {
        const result = RedirectResolver.resolve(
          'complete',
          project,
          mockSupplier,
          mockLink,
          'UID',
          'PID',
          'vendor'
        );

        expect(result.url).toContain('supplier.example.com');
        expect(result.isExternal).toBe(true);
      });

      it('should handle empty string UID/PID', () => {
        const result = RedirectResolver.resolve(
          'complete',
          project,
          null,
          null,
          '',
          '',
          'direct'
        );

        expect(result.url).toBe('/complete');
      });
    });
  });
});
