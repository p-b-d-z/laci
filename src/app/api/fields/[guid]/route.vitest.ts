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
	setCache: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getFields: vi.fn(),
	updateField: vi.fn(),
	getUserByEmail: vi.fn(),
	insertAuditLog: vi.fn(),
}));

describe('Fields API Routes', () => {
	const params = { guid: mockField.id };

	describe('GET /api/fields/[guid]', () => {
		it('should return a field when it exists', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([mockField]);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/fields/${mockField.id}`), { params });

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockField);
		});

		it('should return 404 when field is not found', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([]);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/fields/${mockField.id}`), { params });

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe('Field not found');
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/fields/${mockField.id}`), { params });

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.error).toBe('Internal Server Error');
		});
	});

	describe('PUT /api/fields/[guid]', () => {
		beforeEach(() => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(mockUser);
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([mockField]);
		});

		it('should update a field successfully', async () => {
			const updatedField = { ...mockField, name: 'Updated Field' };
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce([mockField]).mockResolvedValueOnce([updatedField]);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields/${mockField.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Field' }),
				}),
				{ params },
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.name).toBe('Updated Field');
			expect(mysqlQueries.updateField).toHaveBeenCalled();
			expect(mysqlQueries.insertAuditLog).toHaveBeenCalled();
			expect(redisFunctions.setCache).toHaveBeenCalled();
		});

		it('should return 401 when user is not authenticated', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields/${mockField.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Field' }),
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
				new NextRequest(`${TEST_BASE_URL}/api/fields/${mockField.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Updated Field' }),
				}),
				{ params },
			);

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe('Field not found');
		});

		it('should return 400 when name is invalid', async () => {
			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/fields/${mockField.id}`, {
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
				new NextRequest(`${TEST_BASE_URL}/api/fields/${mockField.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Valid Name', order: -1 }),
				}),
				{ params },
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid order provided');
		});
	});
});
