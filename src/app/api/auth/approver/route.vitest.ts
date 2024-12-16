import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';
import { canApprove } from '@/lib/auth/admins';

// Mock external dependencies
vi.mock('@/lib/auth/admins', () => ({
	canApprove: vi.fn(),
}));

describe('Approver API Route', () => {
	describe('GET /api/auth/approver', () => {
		it('should return true when user is an approver', async () => {
			vi.mocked(canApprove).mockResolvedValue(true);
			const response = await GET();

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual({ isApprover: true });
		});

		it('should return false when user is not an approver', async () => {
			vi.mocked(canApprove).mockResolvedValue(false);
			const response = await GET();

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual({ isApprover: false });
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(canApprove).mockRejectedValue(new Error('Test error'));

			const response = await GET();

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual({ isApprover: false });
		});
	});
});
