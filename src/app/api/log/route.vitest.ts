import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from './route';
import serverLogger from '@/lib/logging/server';
import { NextRequest } from 'next/server';
import { TEST_BASE_URL } from '@/constants/index.tests';

// Mock serverLogger
vi.mock('@/lib/logging/server', () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
	},
}));

describe('Log API Routes', () => {
	describe('POST /api/log', () => {
		it('should successfully log a message', async () => {
			const mockPayload = {
				level: 'info',
				message: 'Test message',
				meta: { test: 'data' },
			};

			const response = await POST(
				new NextRequest(`${TEST_BASE_URL}/api/log`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ payload: mockPayload }),
				}),
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toEqual({ success: true });
			expect(serverLogger.info).toHaveBeenCalledWith(mockPayload.level, 'client | ' + mockPayload.message, mockPayload.meta);
		});

		it('should handle invalid request body', async () => {
			const response = await POST(
				new NextRequest(`${TEST_BASE_URL}/api/log`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: 'invalid json',
				}),
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toEqual({ error: 'Invalid request body' });
			expect(serverLogger.error).toHaveBeenCalled();
		});

		it('should handle missing payload', async () => {
			const response = await POST(
				new NextRequest(`${TEST_BASE_URL}/api/log`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				}),
			);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toEqual({ error: 'Invalid request body' });
			expect(serverLogger.error).toHaveBeenCalled();
		});
	});

	describe('GET /api/log', () => {
		it('should return method not allowed', async () => {
			const response = await GET();

			expect(response.status).toBe(405);
			const data = await response.json();
			expect(data).toEqual({ message: 'Method not allowed' });
		});
	});
});
