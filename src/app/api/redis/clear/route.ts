import { NextRequest, NextResponse } from 'next/server';
import { clearCache } from '@/lib/redis/functions';
import serverLogger from '@/lib/logging/server';

export async function POST(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const key = searchParams.get('key');

	if (!key) {
		return NextResponse.json({ error: 'Cache key is required' }, { status: 400 });
	}

	try {
		await clearCache(key);
		return NextResponse.json({ message: 'Cache cleared successfully' });
	} catch (error) {
		serverLogger.error('Error clearing cache:', error);
		return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
	}
}
