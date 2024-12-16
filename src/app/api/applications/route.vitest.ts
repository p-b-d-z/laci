import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import * as redisFunctions from '@/lib/redis/functions';
import * as mysqlQueries from '@/lib/mysql/queries';
import { getServerSession } from 'next-auth/next';
import type { Application } from '@/types';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { mockApplication, mockApplicationDisabled, mockUser, mockSession, TEST_BASE_URL } from '@/constants/index.tests';

// Mock external dependencies
vi.mock('next-auth/next', () => ({
	getServerSession: vi.fn(),
}));

vi.mock('@/lib/redis/functions', () => ({
	getFromRedisOrFetch: vi.fn(),
	setCache: vi.fn(),
}));

vi.mock('@/lib/mysql/queries', () => ({
	getApplications: vi.fn(),
	getApplicationByName: vi.fn(),
	addApplication: vi.fn(),
	getUserByEmail: vi.fn(),
	insertAuditLog: vi.fn(),
}));

describe('Applications API Routes', () => {
	const mockApplications: Application[] = [mockApplication, mockApplicationDisabled];

	describe('GET /api/applications', () => {
		it('should return all applications when showDisabled is true', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockApplications);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/applications?showDisabled=true`));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveLength(2);
			expect(data).toEqual(mockApplications);
		});

		it('should return only enabled applications when showDisabled is false', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockResolvedValue(mockApplications);

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/applications?showDisabled=false`));

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveLength(1);
			expect(data[0].enabled).toBe(true);
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(redisFunctions.getFromRedisOrFetch).mockRejectedValue(new Error('Test error'));

			const response = await GET(new NextRequest(`${TEST_BASE_URL}/api/applications`));

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data).toEqual({ error: 'Failed to fetch applications' });
		});
	});

	describe('POST /api/applications', () => {
		const newId = uuidv4();
		beforeEach(() => {
			vi.mocked(getServerSession).mockResolvedValue(mockSession);
			vi.mocked(mysqlQueries.getUserByEmail).mockResolvedValue(mockUser);
			vi.mocked(mysqlQueries.addApplication).mockResolvedValue(newId);
		});

		it('should create a new application successfully', async () => {
			vi.mocked(mysqlQueries.getApplicationByName).mockResolvedValue(null);

			const response = await POST(
				new NextRequest(`${TEST_BASE_URL}/api/applications`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'New App' }),
				}),
			);

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.name).toBe('New App');
			expect(data.id).toBe(newId);
			expect(mysqlQueries.insertAuditLog).toHaveBeenCalled();
			expect(redisFunctions.setCache).toHaveBeenCalled();
		});

		it('should return 401 when user is not authenticated', async () => {
			vi.mocked(getServerSession).mockResolvedValue(null);

			const response = await POST(
				new NextRequest(`${TEST_BASE_URL}/api/applications`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'New App' }),
				}),
			);

			expect(response.status).toBe(401);
		});

		it('should return 400 when application name already exists', async () => {
			vi.mocked(mysqlQueries.getApplicationByName).mockResolvedValue(mockApplications[0]);

			const response = await POST(
				new NextRequest(`${TEST_BASE_URL}/api/applications`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'Test App 1' }),
				}),
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('An application with this name already exists');
		});

		it('should return 400 when name is missing', async () => {
			const response = await POST(
				new NextRequest(`${TEST_BASE_URL}/api/applications`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				}),
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid application name');
		});
	});
});
