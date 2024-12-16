import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import * as mysqlQueries from '@/lib/mysql/queries';
import * as redisFunctions from '@/lib/redis/functions';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { mockField, mockFields, mockUser, mockSession, TEST_BASE_URL } from '@/constants/index.tests';
import { FIELDS_CACHE_KEY, ONE_WEEK_TTL } from '@/constants';

// Mock external dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getFields: vi.fn(),
	updateField: vi.fn(),
	getUserByEmail: vi.fn(),
	insertAuditLog: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
}));

describe('Field Description API Routes', () => {
	const params = { guid: mockField.id };

	describe('GET /api/fields/[guid]/description', () => {
		beforeEach(() => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockFields);
		});

		it('should return field description successfully', async () => {
			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/fields/${params.guid}/description`), { params });

			expect(redisFunctions.getFromRedisOrFetch).toHaveBeenCalledWith(FIELDS_CACHE_KEY, expect.any(Function), ONE_WEEK_TTL);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.description).toBe(mockField.description);
		});

		it('should return 404 when field is not found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([]);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/fields/${params.guid}/description`), { params });

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe('Field not found');
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/fields/${params.guid}/description`), { params });

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.error).toBe('Internal server error');
		});
	});

	describe('PUT /api/fields/[guid]/description', () => {
		beforeEach(() => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(mockUser);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockFields);
		});

		it('should update field description successfully', async () => {
			const newDescription = 'Updated description';

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields/${params.guid}/description`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ description: newDescription }),
				}),
				{ params },
			);

			expect(response.status).toBe(200);
			expect(mysqlQueries.updateField).toHaveBeenCalled();
			expect(redisFunctions.setCache).toHaveBeenCalledWith(FIELDS_CACHE_KEY, null);
			expect(mysqlQueries.insertAuditLog).toHaveBeenCalled();
			const data = await response.json();
			expect(data.message).toBe('Field description updated successfully');
		});

		it('should return 401 when user is not authenticated', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields/${params.guid}/description`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ description: 'test' }),
				}),
				{ params },
			);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe('Unauthorized');
		});

		it('should return 404 when field is not found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([]);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields/${params.guid}/description`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ description: 'test' }),
				}),
				{ params },
			);

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe('Field not found');
		});

		it('should return 400 when description is invalid', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields/${params.guid}/description`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ description: 123 }), // Invalid type
				}),
				{ params },
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid description provided');
		});
	});
});
