import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import * as mysqlQueries from '@/lib/mysql/queries';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { mockField, mockUser, mockSession, TEST_BASE_URL } from '@/constants/index.tests';

// Mock external dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	clearCache: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getFields: vi.fn(),
	addField: vi.fn(),
	getUserByEmail: vi.fn(),
	insertAuditLog: vi.fn(),
}));

describe('Fields API Routes', () => {
	describe('GET /api/fields', () => {
		it('should fetch fields with cache by default', async () => {
			const fields = [mockField];
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(fields);

			const response = await GET(new Request(TEST_BASE_URL + '/api/fields'));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(fields);
			expect(redisFunctions.getFromRedisOrFetch).toHaveBeenCalledWith('fields', expect.any(Function), 604800, false);
		});

		it('should fetch fields without cache when noCache parameter is present', async () => {
			const fields = [mockField];
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(fields);

			const response = await GET(new Request(TEST_BASE_URL + '/api/fields?noCache'));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(fields);
			expect(redisFunctions.getFromRedisOrFetch).toHaveBeenCalledWith('fields', expect.any(Function), 604800, true);
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET(new Request(TEST_BASE_URL + '/api/fields'));

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({ error: 'Internal Server Error' });
		});
	});

	describe('PUT /api/fields', () => {
		beforeEach(() => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(mockUser);
		});

		it('should create a new field successfully', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'New Field' }),
				}),
			);

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.name).toBe('New Field');
			expect(data.id).toBeDefined();
			expect(mysqlQueries.addField).toHaveBeenCalled();
			expect(mysqlQueries.insertAuditLog).toHaveBeenCalled();
			expect(redisFunctions.clearCache).toHaveBeenCalled();
		});

		it('should return 401 when user is not authenticated', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'New Field' }),
				}),
			);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe('Unauthorized');
		});

		it('should return 400 when name is missing', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				}),
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid field name');
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(mysqlQueries.addField).mockRejectedValue(new Error('Test error'));

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'New Field' }),
				}),
			);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.error).toBe('Internal Server Error');
		});
	});
});
