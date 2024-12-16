import { NextRequest, NextResponse } from 'next/server';
import serverLogger from '@/lib/logging/server';

export async function POST(req: NextRequest) {
	try {
		const { payload } = await req.json();
		serverLogger.info(payload.level, 'client | ' + payload.message, payload.meta);
		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		serverLogger.error(`Error processing log request: ${error}`);
		return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
	}
}

export async function GET() {
	return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}
