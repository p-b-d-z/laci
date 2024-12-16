import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getServerSession } from 'next-auth/next';
import * as redisFunctions from '@/lib/redis/functions';
import * as mysqlQueries from '@/lib/mysql/queries';
import { NextRequest } from 'next/server';
import {
	mockAssignedUser1,
	mockUser,
	mockSession,
	TEST_BASE_URL,
	mockEntry,
	mockApplication,
	mockCategory,
	mockField,
} from '@/constants/index.tests';
import { ONE_HOUR_TTL } from '@/constants';

vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getCategories: vi.fn(),
	getFields: vi.fn(),
	getEntriesByApplicationId: vi.fn(),
	getApplications: vi.fn(),
}));

describe('My Responsibilities API Route', () => {
	const mockEmail = mockUser.email;
	const mockName = mockUser.name;
	const mockStreamData = [
		{ type: 'total', count: 1 },
		{ type: 'progress', processed: 1 },
		{
			type: 'assignments',
			data: [
				{
					...mockEntry,
					applicationName: mockApplication.name,
					categoryName: mockCategory.name,
					fieldName: mockField.name,
				},
			],
		},
		{ type: 'done' },
	];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getServerSession).mockResolvedValue(mockSession);
		vi.mocked(mysqlQueries.getCategories).mockResolvedValue([mockCategory]);
		vi.mocked(mysqlQueries.getFields).mockResolvedValue([mockField]);
		vi.mocked(mysqlQueries.getApplications).mockResolvedValue([mockApplication]);
		vi.mocked(redisFunctions.getFromRedisOrFetch).mockReset();
		vi.mocked(redisFunctions.setCache).mockReset();
		global.fetch = vi.fn();
	});

	it('should return 400 if email is missing', async () => {
		const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/my-responsibilities`));
		expect(response.status).toBe(400);
		expect(await response.text()).toBe('User email is required');
	});

	it('should return cached responsibilities if available', async () => {
		vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValueOnce(mockStreamData);

		const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/my-responsibilities?email=${mockEmail}&name=${mockName}`));

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/x-ndjson');

		const responseText = await response.text();
		const lines = responseText.trim().split('\n');
		const parsedData = lines.map((line) => JSON.parse(line));
		expect(parsedData).toEqual(mockStreamData);
	});

	it('should handle fetch errors gracefully', async () => {
		vi.mocked(redisFunctions.getFromRedisOrFetch)
			.mockResolvedValueOnce([]) // Initial cache check
			.mockRejectedValueOnce(new Error('Fetch failed')); // Applications fetch

		const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/my-responsibilities?email=${mockEmail}&name=${mockName}`));

		expect(response.status).toBe(200);
		const responseText = await response.text();
		const lines = responseText.trim().split('\n');
		const parsedData = lines.map((line) => JSON.parse(line));

		expect(parsedData).toContainEqual({ type: 'error', message: 'Internal Server Error' });
	});

	it('should return entries if session user name matches assignedUsers', async () => {
		vi.mocked(redisFunctions.getFromRedisOrFetch)
			.mockResolvedValueOnce([]) // Initial cache check
			.mockResolvedValueOnce([mockApplication])
			.mockResolvedValueOnce([mockCategory])
			.mockResolvedValueOnce([mockField])
			.mockResolvedValueOnce([mockEntry]);

		const response = await GET(
			new NextRequest(`${TEST_BASE_URL}/api/my-responsibilities?email=${mockEmail}&name=${mockAssignedUser1}`),
		);

		expect(response.status).toBe(200);
		const responseText = await response.text();
		const lines = responseText.trim().split('\n');
		const parsedData = lines.map((line) => JSON.parse(line));

		expect(parsedData).toContainEqual({ type: 'total', count: 1 });
		expect(parsedData).toContainEqual({ type: 'progress', processed: 1 });
		expect(parsedData).toContainEqual({
			type: 'assignments',
			data: [
				{
					...mockEntry,
					applicationName: mockApplication.name,
					categoryName: mockCategory.name,
					fieldName: mockField.name,
				},
			],
		});
	});

	it('should return no entries if session user name and groups do not match assignedUsers', async () => {
		vi.mocked(redisFunctions.getFromRedisOrFetch)
			.mockResolvedValueOnce([]) // Initial cache check
			.mockResolvedValueOnce([mockApplication])
			.mockResolvedValueOnce([mockCategory])
			.mockResolvedValueOnce([mockField])
			.mockResolvedValueOnce([]); // Return empty entries array

		vi.mocked(redisFunctions.setCache).mockResolvedValueOnce(undefined);

		const mockStreamData = [{ type: 'done' }];
		const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/my-responsibilities?email=nobody@nowhere.com&name=Nobody`));

		expect(response.status).toBe(200);
		const responseText = await response.text();
		const lines = responseText.trim().split('\n');
		const parsedData = lines.map((line) => JSON.parse(line));

		expect(parsedData).toContainEqual({ type: 'total', count: 0 });
		expect(parsedData).toContainEqual({ type: 'progress', processed: 1 });
		expect(parsedData).toContainEqual({ type: 'done' });
		expect(vi.mocked(redisFunctions.setCache)).toHaveBeenCalledWith(
			'user:nobody@nowhere.com:responsibilities',
			mockStreamData,
			ONE_HOUR_TTL,
		);
	});
});
