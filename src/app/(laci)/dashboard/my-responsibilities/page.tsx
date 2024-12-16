import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { RefreshButton } from '@/components/client/refresh-button';
import { MyResponsibilitiesView } from '@/components/client/my-responsibilities-view';
import { ViewToggle } from '@/components/client/toggle-view';
import { FilterButtons } from '@/components/client/filter-buttons';
import { getCategories } from '@/lib/mysql/categories';
import { getFields } from '@/lib/mysql/fields';
import { FloatingHeaderScript } from '@/components/client/floating-header';
import { SessionInfo } from '@/components/client/manage-session';
import { Error } from '@/components/client/error';

export default async function MyAssignmentsPage({ searchParams }: { searchParams: { showDisabled?: string } }) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return (
			<Error
				title="401"
				description="Unauthorized. Please log in."
			/>
		);
	}

	const { email = '', name = '' } = session.user ?? {};
	const showDisabled = searchParams.showDisabled !== 'false';

	const [categories, fields] = await Promise.all([getCategories(), getFields()]);

	return (
		<div className="relative">
			<div className="w-full">
				<SessionInfo />
			</div>
			<div
				id="floatingHeader"
				className="sticky top-0 z-10 bg-white shadow-md transition-all duration-300"
			>
				<div className="container mx-auto px-1 py-1 flex justify-between items-center">
					<h1 className="text-xl font-bold">My Responsibilities</h1>
					<div className="flex items-center space-x-2">
						<FilterButtons
							categories={categories}
							fields={fields}
						/>
						<ViewToggle />
						<RefreshButton cacheKeys={[`user:${email}:responsibilities`]} />
					</div>
				</div>
			</div>
			<div className="container mx-auto px-1 py-2">
				<MyResponsibilitiesView
					userEmail={email ?? ''}
					userName={name ?? ''}
					showDisabled={showDisabled}
				/>
			</div>
			<FloatingHeaderScript />
		</div>
	);
}
