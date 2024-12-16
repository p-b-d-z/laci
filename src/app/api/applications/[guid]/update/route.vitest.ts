import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PUT } from './route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import * as mysqlQueries from '@/lib/mysql/queries';
import * as redisFunctions from '@/lib/redis/functions';
import { mockApplication, mockEmail, mockUser, TEST_BASE_URL } from '@/constants/index.tests';

// Mock next-auth
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

// Mock MySQL queries
vi.mock('@/lib/mysql/queries', () => ({
	getApplication: vi.fn(),
	updateApplication: vi.fn(),
	getUserByEmail: vi.fn(),
	insertAuditLog: vi.fn(),
}));

// Mock Redis functions
vi.mock('@/lib/redis/functions', () => ({
	updateCachedApplication: vi.fn(),
}));

describe('PUT /api/applications/[guid]/update', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Setup default mock implementations
		vi.mocked(getServerSession).mockResolvedValue({
			user: { email: mockEmail },
		});
		vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(mockUser);
		vi.mocked(mysqlQueries.getApplication).mockResolvedValue(mockApplication);

		console.log(`IDs | mockApp ${mockApplication.id} mockUser ${mockUser.id}`);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should return 401 if no session exists', async () => {
		vi.mocked(getServerSession).mockResolvedValue(null);

		const request = new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/update`, {
			method: 'PUT',
			body: JSON.stringify({ name: 'Updated App' }),
		});

		const response = await PUT(request, { params: { guid: mockApplication.id } });
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Unauthorized' });
	});

	it('should return 404 if user not found', async () => {
		vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(null);

		const request = new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/update`, {
			method: 'PUT',
			body: JSON.stringify({ name: 'Updated App' }),
		});

		const response = await PUT(request, { params: { guid: mockApplication.id } });
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'User not found' });
	});

	it('should return 404 if application not found', async () => {
		vi.mocked(mysqlQueries.getApplication).mockResolvedValue(null);

		const request = new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/update`, {
			method: 'PUT',
			body: JSON.stringify({ name: 'Updated App' }),
		});

		const response = await PUT(request, { params: { guid: mockApplication.id } });
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'Application not found' });
	});

	it('should successfully update an application', async () => {
		const updateData = { name: 'Updated App Name' };
		const request = new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/update`, {
			method: 'PUT',
			body: JSON.stringify(updateData),
		});

		const response = await PUT(request, { params: { guid: mockApplication.id } });

		expect(response.status).toBe(200);
		const responseData = await response.json();

		// Verify all fields except updatedAt
		expect(responseData).toMatchObject({
			id: mockApplication.id,
			name: 'Updated App Name',
			hitCount: mockApplication.hitCount,
			enabled: mockApplication.enabled,
			createdAt: mockApplication.createdAt,
			modifiedById: mockUser.id,
		});

		// Verify updatedAt is a valid date string
		expect(Date.parse(responseData.updatedAt)).not.toBeNaN();

		// Verify MySQL update was called
		expect(mysqlQueries.updateApplication).toHaveBeenCalled();

		// Verify Redis cache was updated
		expect(redisFunctions.updateCachedApplication).toHaveBeenCalled();

		// Verify audit log was created
		expect(mysqlQueries.insertAuditLog).toHaveBeenCalledWith({
			actor: mockUser.id,
			action: 'change',
			target: 'application',
			targetId: mockApplication.id,
			changes: {
				name: 'Updated App Name',
			},
		});
	});

	it('should handle errors gracefully', async () => {
		vi.mocked(mysqlQueries.updateApplication).mockRejectedValue(new Error('Database error'));

		const request = new NextRequest(`${TEST_BASE_URL}/api/applications/${mockApplication.id}/update`, {
			method: 'PUT',
			body: JSON.stringify({ name: 'Updated App' }),
		});

		const response = await PUT(request, { params: { guid: mockApplication.id } });
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: 'Failed to update application' });
	});
});
