import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import AuditLogClient from '@/components/client/audit-log-client';
import { getAuditLogs } from '@/lib/mysql/queries';
import { Error } from '@/components/client/error';

export default async function AuditPage({ searchParams }: { searchParams: { days?: string } }) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return (
			<Error
				title="401"
				description="Unauthorized. Please log in."
			/>
		);
	}

	const days = searchParams.days ? parseInt(searchParams.days, 10) : 30; // Default to 30 days
	const initialLogs = await getAuditLogs(days);

	return (
		<div className="p-6">
			<h1 className="text-2xl font-bold mb-6">Audit Logs</h1>
			<AuditLogClient
				initialLogs={initialLogs}
				initialDays={days}
			/>
		</div>
	);
}
