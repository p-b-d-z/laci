import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import * as userLib from '@/lib/user';
import * as mysqlQueries from '@/lib/mysql/queries';
import { NextRequest } from 'next/server';
import { mockApplication, TEST_BASE_URL } from '@/constants/index.tests';

// Mock external dependencies
vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	updateCachedApplication: vi.fn(),
	setCache: vi.fn(),
}));

vi.mock('@/lib/user', () => ({
	getCurrentUserId: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getApplications: vi.fn(),
	updateApplication: vi.fn(),
	insertAuditLog: vi.fn(),
}));

describe('Application GUID API Routes', () => {
	beforeEach(() => {
		console.log(`IDs | mockApp ${mockApplication.id}`);
	});

	describe('GET /api/applications/[guid]', () => {
		it('should return application when found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([mockApplication]);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}`), {
				params: { guid: mockApplication.id },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockApplication);
		});

		it('should return 404 when application is not found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([]);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/applications/nonexistent`), {
				params: { guid: 'nonexistent' },
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe('Application not found');
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/applications/123`), { params: { guid: '123' } });

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.error).toBe('Failed to fetch application');
		});
	});

	describe('PUT /api/applications/[guid]', () => {
		const userId = '789';
		const updatedData = { name: 'Updated App', enabled: false, hitCount: 1 };

		beforeEach(() => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([mockApplication]);
			vi.mocked(userLib.getCurrentUserId).mockResolvedValue(userId);
			vi.mocked(mysqlQueries.updateApplication).mockResolvedValue();
			vi.mocked(redisFunctions.setCache).mockResolvedValue();
		});

		it('should update application successfully', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updatedData),
				}),
				{ params: { guid: mockApplication.id } },
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.name).toBe(updatedData.name);
			expect(data.enabled).toBe(updatedData.enabled);
			expect(data.hitCount).toBe(updatedData.hitCount);
			expect(data.modifiedById).toBe(userId);
			expect(mysqlQueries.insertAuditLog).toHaveBeenCalled();
		});

		it('should return 401 when user is not authenticated', async () => {
			vi.mocked(userLib.getCurrentUserId).mockResolvedValue(null);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updatedData),
				}),
				{ params: { guid: mockApplication.id } },
			);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe('Unauthorized');
		});

		it('should return 404 when application is not found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([]);
			vi.mocked(userLib.getCurrentUserId).mockResolvedValue('some-user-id');
			vi.mocked(mysqlQueries.getApplications).mockResolvedValue([]);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/applications/nonexistent`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updatedData),
				}),
				{ params: { guid: 'nonexistent' } },
			);

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe('Application not found');
		});

		it('should handle errors gracefully', async () => {
			// Mock successful auth and application fetch
			vi.mocked(userLib.getCurrentUserId).mockResolvedValue('some-user-id');
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([mockApplication]);

			// Mock the update to fail
			vi.mocked(mysqlQueries.updateApplication).mockRejectedValue(new Error('Test error'));

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updatedData),
				}),
				{ params: { guid: mockApplication.id } }, // Use mockApplication.id to match the found application
			);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.error).toBe('Failed to update application');
		});
	});
});
