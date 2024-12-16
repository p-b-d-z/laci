import { Approvers } from '@/components/client/approvers';
import { RefreshButton } from '@/components/client/refresh-button';
import { isAdmin } from '@/lib/auth/admins';
import { getCurrentUserId } from '@/lib/user';
import { redirect } from 'next/navigation';
import { APPROVERS_CACHE_KEY } from '@/constants';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { Error } from '@/components/client/error';

export default async function ApproversPage() {
	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return (
			<Error
				title="401"
				description="Unauthorized. Please log in."
			/>
		);
	}

	const userId = await getCurrentUserId();
	if (!userId || !(await isAdmin())) {
		redirect(`${process.env.NEXTAUTH_URL}/dashboard/applications`);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">Manage Approvers</h1>
				<RefreshButton cacheKeys={[APPROVERS_CACHE_KEY]} />
			</div>
			<Approvers />
		</div>
	);
}
