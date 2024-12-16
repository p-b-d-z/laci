import { validateTables } from '@/lib/mysql/queries';
import { NextResponse } from 'next/server';

export async function GET() {
	const isHealthy = await validateTables();

	if (!isHealthy) {
		return NextResponse.json({ status: 'error', message: 'Database tables validation failed' }, { status: 500 });
	}

	return NextResponse.json({ status: 'ok', message: 'Database tables validated' }, { status: 200 });
}
