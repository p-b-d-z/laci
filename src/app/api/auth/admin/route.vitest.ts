import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';
import { isAdmin } from '@/lib/auth/admins';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth/admins', () => ({
	isAdmin: vi.fn(),
}));

describe('Admin API Route', () => {
	it('should return true when user is admin', async () => {
		vi.mocked(isAdmin).mockResolvedValue(true);

		const response = await GET();
		const data = await response.json();

		expect(response).toBeInstanceOf(NextResponse);
		expect(data).toEqual({ isAdmin: true });
	});

	it('should return false when user is not admin', async () => {
		vi.mocked(isAdmin).mockResolvedValue(false);

		const response = await GET();
		const data = await response.json();

		expect(response).toBeInstanceOf(NextResponse);
		expect(data).toEqual({ isAdmin: false });
	});

	it('should handle errors and return false', async () => {
		vi.mocked(isAdmin).mockRejectedValue(new Error('Test error'));

		const response = await GET();
		const data = await response.json();

		expect(response).toBeInstanceOf(NextResponse);
		expect(data).toEqual({ isAdmin: false });
	});
});
