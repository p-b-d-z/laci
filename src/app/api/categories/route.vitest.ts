import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import * as mysqlQueries from '@/lib/mysql/queries';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { mockCategory, mockUser, mockSession, TEST_BASE_URL } from '@/constants/index.tests';
import { CATEGORIES_CACHE_KEY, ONE_WEEK_TTL } from '@/constants';

// Mock external dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	clearCache: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getCategories: vi.fn(),
	addCategory: vi.fn(),
	getUserByEmail: vi.fn(),
	insertAuditLog: vi.fn(),
}));

describe('Categories API Routes', () => {
	describe('GET /api/categories', () => {
		it('should fetch categories using getFromRedisOrFetch', async () => {
			const categories = [mockCategory];
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(categories);

			const response = await GET();
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(categories);

			expect(redisFunctions.getFromRedisOrFetch).toHaveBeenCalledWith(CATEGORIES_CACHE_KEY, expect.any(Function), ONE_WEEK_TTL);
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET();
			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({ error: 'Internal Server Error' });
		});
	});

	describe('PUT /api/categories', () => {
		beforeEach(() => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(mockUser);
		});

		it('should create a new category successfully', async () => {
			const newCategoryId = 'new-category-id';
			vi.mocked(mysqlQueries.addCategory).mockResolvedValue(newCategoryId);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'New Category', order: 1 }),
				}),
			);

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.name).toBe('New Category');
			expect(data.id).toBe(newCategoryId);
			expect(mysqlQueries.insertAuditLog).toHaveBeenCalled();
			expect(redisFunctions.clearCache).toHaveBeenCalledWith(CATEGORIES_CACHE_KEY);
		});

		it('should return 401 when user is not authenticated', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'New Category' }),
				}),
			);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe('Unauthorized');
		});

		it('should return 400 when name is missing', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ order: 1 }),
				}),
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid category name');
		});

		it('should return 400 when order is invalid', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'New Category', order: -1 }),
				}),
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid order provided');
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(mysqlQueries.addCategory).mockRejectedValue(new Error('Test error'));

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'New Category' }),
				}),
			);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.error).toBe('Internal Server Error');
		});
	});
});
