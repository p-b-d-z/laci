import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import * as mysqlQueries from '@/lib/mysql/queries';
import { AUDIT_LOGS_CACHE_KEY, USERS_CACHE_KEY, APPLICATIONS_CACHE_KEY, FIELDS_CACHE_KEY, CATEGORIES_CACHE_KEY } from '@/constants';
import {
	mockApplication,
	mockAuditLog,
	mockAuditLogOlderDate,
	mockAuditLogRecentDate,
	mockCategory,
	mockField,
	mockUser,
	TEST_BASE_URL,
} from '@/constants/index.tests';
import { AuditLog } from '@/types';

// Mock Redis configuration
vi.mock('@/lib/redis/config', () => ({
	isRedisConfigured: vi.fn().mockReturnValue(true),
	REDIS_CONFIG: {
		host: 'localhost',
		port: 6379,
	},
}));

// Mock MySQL connection
vi.mock('@/lib/mysql/connection', () => ({
	withTransaction: vi.fn((callback) =>
		callback({
			query: vi.fn().mockResolvedValue([[mockAuditLog]]),
		}),
	),
	withConnection: vi.fn((callback) =>
		callback({
			query: vi.fn().mockResolvedValue([[mockAuditLog]]),
		}),
	),
}));

describe('Audit API Route', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock Redis functions
		vi.spyOn(redisFunctions, 'getFromRedisOrFetch').mockImplementation(async (key, fetchFn) => {
			if (key === AUDIT_LOGS_CACHE_KEY) {
				const result = await fetchFn();
				const logs = Array.isArray(result) ? result : [result];

				return {
					lastDays: 30,
					logs: logs.map((log) => ({
						...mockAuditLog,
						actor_name: mockUser.name,
						target_name: mockApplication.name,
						...log,
					})),
				};
			}

			switch (key) {
				case USERS_CACHE_KEY:
					return [mockUser];
				case APPLICATIONS_CACHE_KEY:
					return [mockApplication];
				case FIELDS_CACHE_KEY:
					return [mockField];
				case CATEGORIES_CACHE_KEY:
					return [mockCategory];
				default:
					return [];
			}
		});

		vi.spyOn(redisFunctions, 'setCache').mockResolvedValue();

		// Mock MySQL queries with proper return values
		vi.spyOn(mysqlQueries, 'getAuditLogsAfterId').mockResolvedValue([mockAuditLog]);
		vi.spyOn(mysqlQueries, 'getAllUsers').mockResolvedValue([mockUser]);
		vi.spyOn(mysqlQueries, 'getApplications').mockResolvedValue([mockApplication]);
		vi.spyOn(mysqlQueries, 'getFields').mockResolvedValue([mockField]);
		vi.spyOn(mysqlQueries, 'getCategories').mockResolvedValue([mockCategory]);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should return audit logs with default 30 days when no lastDays parameter is provided', async () => {
		const request = new NextRequest(`${TEST_BASE_URL}/api/audit`);
		const response = await GET(request);
		const data = await response.json();
		console.log('no lastDays data', data);

		expect(mysqlQueries.getAuditLogsAfterId).toHaveBeenCalledWith(null, 30);
		expect(data).toHaveLength(1);
		expect(data[0]).toMatchObject({
			id: mockAuditLog.id,
			actor: mockUser.id,
			targetId: mockApplication.id,
		});
	});

	it('should return audit logs for specified number of days', async () => {
		const request = new NextRequest(`${TEST_BASE_URL}/api/audit?lastDays=7`);
		const response = await GET(request);
		const data = await response.json();
		console.log('7 Days data', data);

		expect(mysqlQueries.getAuditLogsAfterId).toHaveBeenCalledWith(null, 7);
		expect(data).toHaveLength(1);
	});

	it('should handle cache updates when requesting more days than cached', async () => {
		let fetchFnCalled = false;

		vi.spyOn(redisFunctions, 'getFromRedisOrFetch').mockImplementationOnce(async (key, fetchFn) => {
			if (!fetchFnCalled) {
				fetchFnCalled = true;
				return {
					lastDays: 7,
					logs: [mockAuditLog],
				};
			}
			const logs = await fetchFn();
			return {
				lastDays: 60,
				logs: Array.isArray(logs) ? logs : [logs],
			};
		});

		const request = new NextRequest(`${TEST_BASE_URL}/api/audit?lastDays=60`);
		const response = await GET(request);
		const data = await response.json();
		console.log('60 Days data', data);

		expect(mysqlQueries.getAuditLogsAfterId).toHaveBeenCalledWith(mockAuditLog.id, 53);
		expect(redisFunctions.setCache).toHaveBeenCalled();
		expect(data).toHaveLength(2);
	});

	it('should filter cached logs when requesting fewer days than cached', async () => {
		const oldLog: AuditLog = mockAuditLogOlderDate;
		const recentLog: AuditLog = mockAuditLogRecentDate;

		vi.spyOn(redisFunctions, 'getFromRedisOrFetch').mockImplementationOnce(async () => ({
			lastDays: 30,
			logs: [recentLog, oldLog],
		}));

		const request = new NextRequest(`${TEST_BASE_URL}/api/audit?lastDays=10`);
		const response = await GET(request);
		const data = await response.json();
		console.log('10 Days data', data);

		expect(mysqlQueries.getAuditLogsAfterId).not.toHaveBeenCalled();
		expect(data).toHaveLength(1);
	});
});
