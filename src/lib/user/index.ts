import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { getUserByEmail } from '@/lib/mysql/queries';

export async function getCurrentUserId(): Promise<string | null> {
	const session = await getServerSession(authOptions);
	if (!session?.user?.email) return null;

	const user = await getUserByEmail(session.user.email);
	return user ? user.id : null;
}
