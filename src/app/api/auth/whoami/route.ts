import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import serverLogger from '@/lib/logging/server';

export async function GET() {
	try {
		const session = await getServerSession(authOptions);

		if (session) {
			return NextResponse.json({
				authenticated: true,
				user: session.user,
			});
		} else {
			return NextResponse.json(
				{
					authenticated: false,
				},
				{ status: 401 },
			);
		}
	} catch (error) {
		serverLogger.error('Error getting session:', error);
		return NextResponse.json(
			{
				authenticated: false,
				error: 'Failed to verify authentication status',
			},
			{ status: 401 },
		);
	}
}
