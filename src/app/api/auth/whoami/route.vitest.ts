import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';
import { getServerSession } from 'next-auth/next';
import { mockSession, mockUser } from '@/constants/index.tests';

// Mock next-auth
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/logging/server', () => ({
	default: {
		error: vi.fn(),
	},
}));

describe('Whoami API Route', () => {
	it('should return authenticated user data when session exists', async () => {
		vi.mocked(getServerSession).mockResolvedValue(mockSession);

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({
			authenticated: true,
			user: {
				email: mockUser.email,
				name: mockUser.name,
			},
		});
	});

	it('should return unauthenticated status when no session exists', async () => {
		vi.mocked(getServerSession).mockResolvedValue(null);

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data).toEqual({
			authenticated: false,
		});
	});

	it('should handle session errors gracefully', async () => {
		vi.mocked(getServerSession).mockRejectedValue(new Error('Session error'));

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data).toEqual({
			authenticated: false,
			error: 'Failed to verify authentication status',
		});
	});
});
