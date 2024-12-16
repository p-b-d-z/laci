import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { getServerSession } from 'next-auth/next';
import { findAndReplaceUsers } from '@/lib/find-replace';
import { getUserByEmail } from '@/lib/mysql/queries';
import { NextRequest } from 'next/server';
import { mockUser, mockSession, TEST_BASE_URL } from '@/constants/index.tests';

// Mock external dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/find-replace', () => ({
	findAndReplaceUsers: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getUserByEmail: vi.fn(),
}));

describe('Find Replace API Route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(getUserByEmail).mockResolvedValue(mockUser);
	});

	it('should successfully perform find and replace operation', async () => {
		const replacedCount = 5;
		vi.mocked(findAndReplaceUsers).mockResolvedValue(replacedCount);

		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					findUser: 'oldUser',
					replaceUser: 'newUser',
				}),
			}),
		);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ replacedCount });
		expect(findAndReplaceUsers).toHaveBeenCalledWith('', 'oldUser', 'newUser', mockUser.id);
	});

	it('should return 401 when user is not authenticated', async () => {
		vi.mocked(getServerSession).mockResolvedValue(null);

		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					findUser: 'oldUser',
					replaceUser: 'newUser',
				}),
			}),
		);

		expect(response.status).toBe(401);
		const data = await response.json();
		expect(data).toEqual({ error: 'Unauthorized' });
	});

	it('should return 404 when user is not found', async () => {
		vi.mocked(getUserByEmail).mockResolvedValue(null);

		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					findUser: 'oldUser',
					replaceUser: 'newUser',
				}),
			}),
		);

		expect(response.status).toBe(404);
		const data = await response.json();
		expect(data).toEqual({ error: 'User not found' });
	});

	it('should return 400 when required parameters are missing', async () => {
		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					findUser: 'oldUser',
					// replaceUser missing
				}),
			}),
		);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data).toEqual({ error: 'Both findUser and replaceUser are required' });
	});

	it('should handle internal server errors', async () => {
		vi.mocked(findAndReplaceUsers).mockRejectedValue(new Error('Database error'));

		const response = await POST(
			new NextRequest(`${TEST_BASE_URL}/api/entries/find-replace`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					findUser: 'oldUser',
					replaceUser: 'newUser',
				}),
			}),
		);

		expect(response.status).toBe(500);
		const data = await response.json();
		expect(data).toEqual({ error: 'Internal Server Error' });
	});
});
