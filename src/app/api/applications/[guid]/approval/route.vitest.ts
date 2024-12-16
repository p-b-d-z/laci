import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST } from './route';
import * as queries from '@/lib/mysql/queries';
import * as userLib from '@/lib/user';
import * as authLib from '@/lib/auth/admins';
import * as redisLib from '@/lib/redis/functions';
import { mockApplication, mockUser, TEST_BASE_URL } from '@/constants/index.tests';

vi.mock('@/lib/mysql/queries');
vi.mock('@/lib/user');
vi.mock('@/lib/auth/admins');
vi.mock('@/lib/redis/functions');
vi.mock('@/lib/redis/config', () => ({
	isRedisConfigured: vi.fn().mockReturnValue(true),
	REDIS_CONFIG: {
		host: 'localhost',
		port: 6379,
	},
}));
vi.mock('@/lib/logging/server', () => ({
	default: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe('POST /api/applications/[guid]/approval', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(authLib.canApprove).mockResolvedValue(true);
		vi.mocked(userLib.getCurrentUserId).mockResolvedValue(mockUser.id);
		vi.mocked(redisLib.clearCache).mockResolvedValue();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should approve an application successfully', async () => {
		const request = new Request(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/approval`, {
			method: 'POST',
			body: JSON.stringify({ approve: true }),
		});

		const response = await POST(request, { params: { guid: mockApplication.id } });
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({ success: true });
		expect(queries.approveApplication).toHaveBeenCalledWith(mockApplication.id, mockUser.id);
		expect(queries.insertAuditLog).toHaveBeenCalledWith({
			actor: mockUser.id,
			action: 'change',
			target: 'application',
			targetId: mockApplication.id,
			changes: { approval: 'approved' },
		});
		expect(redisLib.clearCache).toHaveBeenCalled();
	});

	it('should revoke an approval successfully', async () => {
		const request = new Request(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/approval`, {
			method: 'POST',
			body: JSON.stringify({ approve: false }),
		});

		const response = await POST(request, { params: { guid: mockApplication.id } });
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({ success: true });
		expect(queries.revokeApproval).toHaveBeenCalledWith(mockApplication.id);
		expect(queries.insertAuditLog).toHaveBeenCalledWith({
			actor: mockUser.id,
			action: 'change',
			target: 'application',
			targetId: mockApplication.id,
			changes: { approval: 'revoked' },
		});
		expect(redisLib.clearCache).toHaveBeenCalled();
	});

	it('should return 403 when user lacks permission', async () => {
		vi.mocked(authLib.canApprove).mockResolvedValue(false);

		const request = new Request(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/approval`, {
			method: 'POST',
			body: JSON.stringify({ approve: true }),
		});

		const response = await POST(request, { params: { guid: mockApplication.id } });
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data).toEqual({ error: 'Forbidden' });
		expect(queries.approveApplication).not.toHaveBeenCalled();
		expect(queries.revokeApproval).not.toHaveBeenCalled();
	});

	it('should return 401 when user is not authenticated', async () => {
		vi.mocked(userLib.getCurrentUserId).mockResolvedValue(null);

		const request = new Request(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/approval`, {
			method: 'POST',
			body: JSON.stringify({ approve: true }),
		});

		const response = await POST(request, { params: { guid: mockApplication.id } });
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data).toEqual({ error: 'Unauthorized' });
		expect(queries.approveApplication).not.toHaveBeenCalled();
		expect(queries.revokeApproval).not.toHaveBeenCalled();
	});

	it('should handle errors gracefully', async () => {
		vi.mocked(queries.approveApplication).mockRejectedValue(new Error('Database error'));

		const request = new Request(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/approval`, {
			method: 'POST',
			body: JSON.stringify({ approve: true }),
		});

		const response = await POST(request, { params: { guid: mockApplication.id } });
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data).toEqual({ error: 'Failed to update approval status' });
	});
});
