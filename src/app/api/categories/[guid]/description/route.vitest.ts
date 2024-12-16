import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import * as mysqlQueries from '@/lib/mysql/queries';
import * as redisFunctions from '@/lib/redis/functions';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { mockCategory, mockCategories, mockUser, mockSession, TEST_BASE_URL } from '@/constants/index.tests';
import { CATEGORIES_CACHE_KEY, ONE_WEEK_TTL } from '@/constants';

// Mock external dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getCategories: vi.fn(),
	getUserByEmail: vi.fn(),
	updateCategory: vi.fn(),
	insertAuditLog: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
}));

describe('Category Description API Routes', () => {
	const params = { guid: mockCategory.id };

	describe('GET /api/categories/[guid]/description', () => {
		beforeEach(() => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockCategories);
		});

		it('should return category description', async () => {
			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/categories/${params.guid}/description`), { params });

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual({ description: mockCategory.description });
			expect(redisFunctions.getFromRedisOrFetch).toHaveBeenCalledWith(CATEGORIES_CACHE_KEY, expect.any(Function), ONE_WEEK_TTL);
		});

		it('should return 404 when category not found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([]);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/categories/${params.guid}/description`), { params });

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toEqual({ error: 'Category not found' });
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/categories/${params.guid}/description`), { params });

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({ error: 'Internal server error' });
		});
	});

	describe('PUT /api/categories/[guid]/description', () => {
		beforeEach(() => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(mockUser);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockCategories);
		});

		it('should update category description successfully', async () => {
			const newDescription = 'Updated description';

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${params.guid}/description`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ description: newDescription }),
				}),
				{ params },
			);

			expect(response.status).toBe(200);
			expect(mysqlQueries.updateCategory).toHaveBeenCalled();
			expect(mysqlQueries.insertAuditLog).toHaveBeenCalled();
			expect(redisFunctions.setCache).toHaveBeenCalledWith(CATEGORIES_CACHE_KEY, null);
			const data = await response.json();
			expect(data).toEqual({ message: 'Category description updated successfully' });
		});

		it('should return 401 when user is not authenticated', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${params.guid}/description`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ description: 'test' }),
				}),
				{ params },
			);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data).toEqual({ error: 'Unauthorized' });
		});

		it('should return 404 when category not found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([]);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${params.guid}/description`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ description: 'test' }),
				}),
				{ params },
			);

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data).toEqual({ error: 'Category not found' });
		});

		it('should return 400 when description is invalid', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${params.guid}/description`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ description: 123 }), // Invalid type
				}),
				{ params },
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toEqual({ error: 'Invalid description provided' });
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(mysqlQueries.updateCategory).mockRejectedValue(new Error('Test error'));

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${params.guid}/description`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ description: 'test' }),
				}),
				{ params },
			);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({ error: 'Internal server error' });
		});
	});
});
