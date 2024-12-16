import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import * as mysqlQueries from '@/lib/mysql/queries';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { mockEntry, mockUser, mockSession, TEST_BASE_URL } from '@/constants/index.tests';

// Mock external dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
	clearCache: vi.fn(),
	getCache: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getEntriesByApplicationId: vi.fn(),
	addEntry: vi.fn(),
	updateEntry: vi.fn(),
	getUserByEmail: vi.fn(),
	insertAuditLog: vi.fn(),
}));

describe('Entries API Routes', () => {
	const applicationId = 'test-app-id';
	const params = { params: { applicationId, entryId: 'test-entry-id' } };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(mockUser);
	});

	describe('GET /api/entries/[applicationId]', () => {
		it('should return entries successfully', async () => {
			const mockEntries = [mockEntry];
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockEntries);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/entries/${applicationId}`), params);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual(mockEntries);
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/entries/${applicationId}`), params);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({ error: 'Internal Server Error' });
		});
	});

	describe('POST /api/entries/[applicationId]', () => {
		const validEntryData = {
			assignedUsers: ['user1@test.com', 'user2@test.com'],
			categoryId: 'test-category',
			fieldId: 'test-field',
		};

		it('should create a new entry successfully', async () => {
			vi.mocked(mysqlQueries.getEntriesByApplicationId).mockResolvedValue([]);

			const response = await POST(
				new NextRequest(`${TEST_BASE_URL}/api/entries/${applicationId}`, {
					method: 'POST',
					body: JSON.stringify(validEntryData),
				}),
				params,
			);

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.applicationId).toBe(applicationId);
			expect(data.assignedUsers).toEqual(validEntryData.assignedUsers);
			expect(mysqlQueries.addEntry).toHaveBeenCalled();
			expect(mysqlQueries.insertAuditLog).toHaveBeenCalled();
		});

		it('should return 400 for invalid entry data', async () => {
			const response = await POST(
				new NextRequest(`${TEST_BASE_URL}/api/entries/${applicationId}`, {
					method: 'POST',
					body: JSON.stringify({ assignedUsers: 'not-an-array' }),
				}),
				params,
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid entry data: missing required fields');
		});

		it('should return 401 when user is not authenticated', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await POST(
				new NextRequest(`${TEST_BASE_URL}/api/entries/${applicationId}`, {
					method: 'POST',
					body: JSON.stringify(validEntryData),
				}),
				params,
			);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.error).toBe('Unauthorized');
		});
	});

	describe('PUT /api/entries/[applicationId]', () => {
		const existingEntry = {
			...mockEntry,
			applicationId,
			categoryId: 'test-category',
			fieldId: 'test-field',
		};

		const updateData = {
			assignedUsers: ['updated@test.com'],
			categoryId: existingEntry.categoryId,
			fieldId: existingEntry.fieldId,
		};

		it('should update an existing entry successfully', async () => {
			vi.mocked(mysqlQueries.getEntriesByApplicationId).mockResolvedValue([existingEntry]);

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/entries/${applicationId}`, {
					method: 'PUT',
					body: JSON.stringify(updateData),
				}),
				params,
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.assignedUsers).toEqual(updateData.assignedUsers);
			expect(mysqlQueries.updateEntry).toHaveBeenCalled();
			expect(mysqlQueries.insertAuditLog).toHaveBeenCalled();
			expect(redisFunctions.clearCache).toHaveBeenCalled();
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(mysqlQueries.getEntriesByApplicationId).mockRejectedValue(new Error('Test error'));

			const response = await PUT(
				new NextRequest(`${TEST_BASE_URL}/api/entries/${applicationId}`, {
					method: 'PUT',
					body: JSON.stringify(updateData),
				}),
				params,
			);

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.error).toBe('Internal Server Error');
		});
	});
});
