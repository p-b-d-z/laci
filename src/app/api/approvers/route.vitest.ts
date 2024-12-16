import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
import * as queries from '@/lib/mysql/queries';
import * as redisFunctions from '@/lib/redis/functions';
import * as userLib from '@/lib/user';
import * as authLib from '@/lib/auth/admins';
import { GET, POST, DELETE } from './route';
import { mockApproverGroup, mockApproverUser, mockUser } from '@/constants/index.tests';

// Mock the external dependencies
vi.mock('@/lib/mysql/queries');
vi.mock('@/lib/redis/functions');
vi.mock('@/lib/redis/config', () => ({
	isRedisConfigured: vi.fn().mockReturnValue(true),
	REDIS_CONFIG: {
		host: 'localhost',
		port: 6379,
	},
}));
vi.mock('@/lib/user');
vi.mock('@/lib/auth/admins');
vi.mock('@/lib/logging/server', () => ({
	default: {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

describe('Approvers API Routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/approvers', () => {
		it('should return approvers from cache', async () => {
			vi.spyOn(redisFunctions, 'getFromRedisOrFetch').mockResolvedValue([mockApproverGroup, mockApproverUser]);

			const response = await GET();
			const data = await response.json();

			expect(response).toBeInstanceOf(NextResponse);
			expect(data).toEqual([mockApproverGroup, mockApproverUser]);
		});

		it('should handle errors gracefully', async () => {
			vi.spyOn(redisFunctions, 'getFromRedisOrFetch').mockRejectedValue(new Error('Test error'));

			const response = await GET();
			const data = await response.json();

			expect(response).toBeInstanceOf(NextResponse);
			expect(response.status).toBe(500);
			expect(data).toEqual({ error: 'Failed to get approvers' });
		});
	});

	describe('POST /api/approvers', () => {
		const mockRequest = {
			json: () =>
				Promise.resolve({
					type: 'user',
					displayName: 'Test User',
					identifier: 'test@example.com',
				}),
		} as Request;

		it('should add a new approver when authorized', async () => {
			vi.spyOn(userLib, 'getCurrentUserId').mockResolvedValue(mockUser.id);
			vi.spyOn(authLib, 'isAdmin').mockResolvedValue(true);
			vi.spyOn(queries, 'addApprover').mockResolvedValue('newId123');
			vi.spyOn(redisFunctions, 'clearCache').mockResolvedValue();

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(response).toBeInstanceOf(NextResponse);
			expect(data).toEqual({ id: 'newId123' });
			expect(redisFunctions.clearCache).toHaveBeenCalled();
		});

		it('should return 401 when unauthorized', async () => {
			vi.spyOn(userLib, 'getCurrentUserId').mockResolvedValue('user123');
			vi.spyOn(authLib, 'isAdmin').mockResolvedValue(false);

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data).toEqual({ error: 'Unauthorized' });
		});
	});

	describe('DELETE /api/approvers', () => {
		const mockRequest = {
			json: () => Promise.resolve({ id: 'approver123' }),
		} as Request;

		it('should delete an approver when authorized', async () => {
			vi.spyOn(userLib, 'getCurrentUserId').mockResolvedValue('user123');
			vi.spyOn(authLib, 'isAdmin').mockResolvedValue(true);
			vi.spyOn(queries, 'removeApprover').mockResolvedValue();
			vi.spyOn(redisFunctions, 'clearCache').mockResolvedValue();

			const response = await DELETE(mockRequest);
			const data = await response.json();

			expect(response).toBeInstanceOf(NextResponse);
			expect(data).toEqual({ success: true });
			expect(redisFunctions.clearCache).toHaveBeenCalled();
		});

		it('should return 401 when unauthorized', async () => {
			vi.spyOn(userLib, 'getCurrentUserId').mockResolvedValue('user123');
			vi.spyOn(authLib, 'isAdmin').mockResolvedValue(false);

			const response = await DELETE(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data).toEqual({ error: 'Unauthorized' });
		});

		it('should handle errors gracefully', async () => {
			vi.spyOn(userLib, 'getCurrentUserId').mockResolvedValue('user123');
			vi.spyOn(authLib, 'isAdmin').mockResolvedValue(true);
			vi.spyOn(queries, 'removeApprover').mockRejectedValue(new Error('Test error'));

			const response = await DELETE(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data).toEqual({ error: 'Failed to remove approver' });
		});
	});
});
