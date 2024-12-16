import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import * as mysqlQueries from '@/lib/mysql/queries';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { mockCategory, mockUser, mockSession, TEST_BASE_URL } from '@/constants/index.tests';

// Mock external dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	updateCategory: vi.fn(),
	getUserByEmail: vi.fn(),
	getCategories: vi.fn(),
	insertAuditLog: vi.fn(),
}));

describe('Categories API Routes', () => {
	describe('PUT /api/categories/[guid]', () => {
		const guid = mockCategory.id;
		const params = { guid };

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(mockUser);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([mockCategory]);
		});

		it('should update a category successfully with name only', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${guid}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Category' }),
				}),
				{ params },
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.message).toBe('Category updated successfully');
			expect(mysqlQueries.updateCategory).toHaveBeenCalled();
			expect(mysqlQueries.insertAuditLog).toHaveBeenCalled();
			expect(redisFunctions.setCache).toHaveBeenCalled();
		});

		it('should update a category successfully with name and order', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${guid}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Category', order: 2 }),
				}),
				{ params },
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.message).toBe('Category updated successfully');
		});

		it('should return 401 when user is not authenticated', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${guid}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Category' }),
				}),
				{ params },
			);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe('Unauthorized');
		});

		it('should return 404 when user is not found', async () => {
			vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(null);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${guid}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Category' }),
				}),
				{ params },
			);

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe('User not found');
		});

		it('should return 404 when category is not found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([]);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${guid}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Category' }),
				}),
				{ params },
			);

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe('Category not found');
		});

		it('should return 400 when name is invalid', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${guid}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: '' }),
				}),
				{ params },
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid name provided');
		});

		it('should return 400 when order is invalid', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${guid}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Category', order: -1 }),
				}),
				{ params },
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid order provided');
		});

		it('should handle internal server errors', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([mockCategory]);
			vi.mocked(mysqlQueries.updateCategory).mockRejectedValue(new Error('Database error'));

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/categories/${guid}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Category' }),
				}),
				{ params },
			);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.error).toBe('Internal server error');
		});
	});
});
