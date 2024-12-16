import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { JWT } from 'next-auth/jwt';
import { ADMIN_GROUPS, ROUTE_ACCESS_RULES } from '@/constants';

export default withAuth(
	function middleware(req) {
		const token = req.nextauth.token as JWT & { groups?: string[] };
		const path = req.nextUrl.pathname;

		if (req.nextUrl.pathname.startsWith('/api/')) {
			if (!req.nextauth.token) {
				return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
			} else {
				return NextResponse.next();
			}
		}

		// Check if the current path starts with any of the protected routes
		const matchingRule = Object.keys(ROUTE_ACCESS_RULES).find((route) => path.startsWith(route));

		if (matchingRule) {
			const requiredGroups = ROUTE_ACCESS_RULES[matchingRule as keyof typeof ROUTE_ACCESS_RULES];
			const isAdminRoute = requiredGroups.includes('admin');

			// For admin routes, check if user has admin group
			if (isAdminRoute && (!token.groups || !token.groups.some((group) => ADMIN_GROUPS.includes(group)))) {
				return NextResponse.redirect(new URL('/unauthorized', req.url));
			}

			// For authenticated routes, check if token exists
			if (requiredGroups.includes('authenticated') && !token) {
				return NextResponse.redirect(new URL('/unauthorized', req.url));
			}
		}

		return NextResponse.next();
	},
	{
		callbacks: {
			authorized: ({ token }) => !!token,
		},
	},
);

// Specify which routes this middleware should run for
export const config = {
	matcher: [
		'/',
		'/((?!_next/static|_next/image|favicon.ico|auth|health).*)',
		'/api/:path*',
		'/dashboard/:path*',
		'/settings/:path*',
		'/approvers/:path*',
	],
};
