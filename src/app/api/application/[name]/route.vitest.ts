import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as redisFunctions from '@/lib/redis/functions';
import * as userLib from '@/lib/user';
import * as mysqlQueries from '@/lib/mysql/queries';
import { GET, PUT } from './route';
import { v4 as uuidv4 } from 'uuid';
import { TEST_BASE_URL, mockApplication, mockUser } from '@/constants/index.tests';

// Mock all external dependencies
vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	updateCachedApplication: vi.fn(),
}));

vi.mock('@/lib/user', () => ({
	getCurrentUserId: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getApplications: vi.fn(),
	getApplicationByName: vi.fn(),
	updateApplication: vi.fn(),
	insertAuditLog: vi.fn(),
}));

describe('Application API Routes', () => {
	beforeEach(() => {
		console.log(`IDs | mockApp ${mockApplication.id} mockUser ${mockUser.id}`);
	});
	it('GET should return application when found', async () => {
		vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue([mockApplication]);

		const response = await GET(new Request(`${TEST_BASE_URL}/api/applications/${mockApplication.name}`), {
			params: { name: 'Test-App' },
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual(mockApplication);
	});

	it('PUT should update application successfully', async () => {
		const userId = uuidv4();
		const updatedData = { name: 'Updated App', enabled: true, hitCount: 1 };

		vi.mocked(userLib.getCurrentUserId).mockResolvedValue(userId);
		vi.mocked(mysqlQueries.getApplicationByName).mockResolvedValue(mockApplication);
		vi.mocked(mysqlQueries.updateApplication).mockResolvedValue();
		vi.mocked(redisFunctions.updateCachedApplication).mockResolvedValue();
		vi.mocked(mysqlQueries.insertAuditLog).mockResolvedValue();

		const response = await PUT(
			new Request(`${TEST_BASE_URL}/api/applications/${mockApplication.name}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatedData),
			}),
			{ params: { name: 'Test-App' } },
		);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.name).toBe(updatedData.name);
		expect(data.modifiedById).toBe(userId);
	});

	it('PUT should return 401 when user is not authenticated', async () => {
		vi.mocked(userLib.getCurrentUserId).mockResolvedValue(null);

		const response = await PUT(
			new Request(`${TEST_BASE_URL}/api/applications/${mockApplication.name}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Updated App' }),
			}),
			{ params: { name: 'Test-App' } },
		);

		expect(response.status).toBe(401);
	});
});
