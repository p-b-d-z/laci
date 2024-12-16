import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/providers';
import { CustomSession } from '@/types';
import { ADMIN_GROUPS } from '@/constants';
import { Approver } from '@/types';
import { headers } from 'next/headers';
// import serverLogger from '@/lib/logging/server';

async function fetchApprovers(): Promise<Approver[]> {
	const headersList = headers();
	const fetchOptions = {
		headers: {
			'Content-Type': 'application/json',
			Cookie: headersList.get('cookie') || '',
		},
		cache: 'no-store' as const,
	};
	const response = await fetch(`${process.env.NEXTAUTH_URL}/api/approvers`, fetchOptions);

	if (!response.ok) {
		throw new Error('Failed to fetch approvers');
	}

	return response.json();
}

export async function isAdmin(): Promise<boolean> {
	const session = (await getServerSession(authOptions)) as CustomSession;
	if (!session?.user?.groups) return false;

	return session.user.groups.some((group) => ADMIN_GROUPS.includes(group));
}

export async function canApprove(): Promise<boolean> {
	const session = (await getServerSession(authOptions)) as CustomSession;
	if (!session?.user) return false;
	// serverLogger.debug(`Session: ${JSON.stringify(session)}`)
	const approvers = await fetchApprovers();
	const approverIdentifiers = approvers.map((a) => a.identifier);

	// Check user's email, upn, and preferredUsername
	if (
		(session.user.email && approverIdentifiers.includes(session.user.email)) ||
		(session.user.upn && approverIdentifiers.includes(session.user.upn)) ||
		(session.user.preferredUsername && approverIdentifiers.includes(session.user.preferredUsername))
	) {
		return true;
	}

	if (session.user.groups) {
		// serverLogger.debug(`User groups: ${session.user.groups}`)
		return session.user.groups.some((group) => approverIdentifiers.includes(group));
	}

	return false;
}
