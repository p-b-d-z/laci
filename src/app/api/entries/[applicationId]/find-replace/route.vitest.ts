import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { mockUser, mockSession, TEST_BASE_URL } from '@/constants/index.tests';
import * as mysqlQueries from '@/lib/mysql/queries';
import * as findReplaceLib from '@/lib/find-replace';

// Mock external dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getUserByEmail: vi.fn(),
}));

vi.mock('@/lib/find-replace', () => ({
	findAndReplaceUsers: vi.fn(),
}));

describe('Find-Replace API Route', () => {
	const mockParams = { applicationId: 'test-app-id' };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(mockUser);
	});

	it('should successfully perform find-replace operation', async () => {
		vi.mocked(findReplaceLib.findAndReplaceUsers).mockResolvedValue(5);

		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/${mockParams.applicationId}/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ findUser: 'user1', replaceUser: 'user2' }),
			}),
			{ params: mockParams },
		);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ replacedCount: 5 });
		expect(findReplaceLib.findAndReplaceUsers).toHaveBeenCalledWith(mockParams.applicationId, 'user1', 'user2', mockUser.id);
	});

	it('should handle "all" applications case', async () => {
		vi.mocked(findReplaceLib.findAndReplaceUsers).mockResolvedValue(10);

		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/all/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ findUser: 'user1', replaceUser: 'user2' }),
			}),
			{ params: { applicationId: 'all' } },
		);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ replacedCount: 10 });
		expect(findReplaceLib.findAndReplaceUsers).toHaveBeenCalledWith(null, 'user1', 'user2', mockUser.id);
	});

	it('should return 401 when user is not authenticated', async () => {
		vi.mocked(getServerSession).mockResolvedValue(null);

		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/${mockParams.applicationId}/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ findUser: 'user1', replaceUser: 'user2' }),
			}),
			{ params: mockParams },
		);

		expect(response.status).toBe(401);
		const data = await response.json();
		expect(data).toEqual({ error: 'Unauthorized' });
	});

	it('should return 404 when user is not found', async () => {
		vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(null);

		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/${mockParams.applicationId}/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ findUser: 'user1', replaceUser: 'user2' }),
			}),
			{ params: mockParams },
		);

		expect(response.status).toBe(404);
		const data = await response.json();
		expect(data).toEqual({ error: 'User not found' });
	});

	it('should return 400 when findUser or replaceUser is missing', async () => {
		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/${mockParams.applicationId}/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ findUser: 'user1' }), // Missing replaceUser
			}),
			{ params: mockParams },
		);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data).toEqual({ error: 'Both findUser and replaceUser are required' });
	});

	it('should handle internal server errors', async () => {
		vi.mocked(findReplaceLib.findAndReplaceUsers).mockRejectedValue(new Error('Database error'));

		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/${mockParams.applicationId}/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ findUser: 'user1', replaceUser: 'user2' }),
			}),
			{ params: mockParams },
		);

		expect(response.status).toBe(500);
		const data = await response.json();
		expect(data).toEqual({ error: 'Internal Server Error' });
	});
});
