import { updateApplication } from '@/lib/mysql/queries';
import { ENTRY_CACHE_KEY } from '@/constants';
import { LaciEntryEditor } from '@/components/client/laci-editor';
import DeleteApplicationButton from '@/components/client/application-delete';
import { RefreshAndFindReplace } from '@/components/client/refresh-and-find-replace';
import { LaciEditorProvider } from '@/contexts/LaciEditorContext';
import { FloatingHeaderScript } from '@/components/client/floating-header';
import { updateCachedApplication } from '@/lib/redis/functions';
import ApplicationDisable from '@/components/client/application-disable';
import { ApprovalButton } from '@/components/client/approval-button';
import { Error } from '@/components/client/error';
import { ApplicationApproval, Category, Field, Entry } from '@/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { headers } from 'next/headers';

export default async function ApplicationPage({ params }: { params: { name: string } }) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return (
			<Error
				title="401"
				description="Unauthorized. Please log in."
			/>
		);
	}
	const { name } = params;

	try {
		const cleanName = name.replace(/-/g, ' ').replace(/%20/g, ' ').toLowerCase();
		const headersList = headers();
		const fetchOptions = {
			headers: {
				'Content-Type': 'application/json',
				Cookie: headersList.get('cookie') || '',
			},
			cache: 'no-store' as const,
		};

		const applicationRes = await fetch(`${process.env.NEXTAUTH_URL}/api/application/${cleanName}`, fetchOptions);

		if (!applicationRes.ok) {
			if (applicationRes.status === 401 || applicationRes.status === 403) {
				return (
					<Error
						title="Authentication Error"
						description="You must be logged in to view this application"
					/>
				);
			}

			const errorText = await applicationRes.text();
			console.error('Application fetch error:', errorText);

			return (
				<Error
					title={applicationRes.status.toString()}
					description={'Application not found!'}
					details={`Name: ${cleanName}, Status: ${applicationRes.status}`}
				/>
			);
		}

		let application;
		try {
			application = await applicationRes.json();
		} catch (e) {
			console.error('JSON parse error:', e);
			return (
				<Error
					title="Data Error"
					description="Failed to parse application data"
					details={`Error parsing JSON response`}
				/>
			);
		}

		application.hitCount += 1;
		await updateApplication(application);
		await updateCachedApplication(application);

		const [categoriesRes, fieldsRes, entriesRes, approvalRes] = await Promise.all([
			await fetch(`${process.env.NEXTAUTH_URL}/api/categories`, fetchOptions),
			await fetch(`${process.env.NEXTAUTH_URL}/api/fields`, fetchOptions),
			await fetch(`${process.env.NEXTAUTH_URL}/api/entries/${application.id}`, fetchOptions),
			await fetch(`${process.env.NEXTAUTH_URL}/api/applications/approvals`, fetchOptions),
		]);

		if (!categoriesRes.ok) {
			return (
				<Error
					title="404"
					description={'Categories not found!'}
				/>
			);
		}
		if (!fieldsRes.ok) {
			return (
				<Error
					title="404"
					description={'Fields not found!'}
				/>
			);
		}
		if (!entriesRes.ok) {
			return (
				<Error
					title="404"
					description={'Entries not found!'}
				/>
			);
		}

		const categoriesData = await categoriesRes.json();
		const fieldsData = await fieldsRes.json();
		const entriesData = await entriesRes.json();
		const approvalData: ApplicationApproval[] = await approvalRes.json();
		const approvalStatus = approvalData.find((approval: ApplicationApproval) => approval.applicationId === application.id);
		const [categories, fields, entries] = await Promise.all([categoriesData, fieldsData, entriesData]);

		return (
			<LaciEditorProvider>
				<div className="relative">
					<div
						id="floatingHeader"
						className="sticky top-0 z-10 bg-white shadow-md transition-all duration-300"
					>
						<div className="container mx-auto px-1 py-1 flex justify-between items-center">
							<h1 className="text-xl font-bold">{application.name}</h1>
							<div className="flex space-x-1">
								<ApprovalButton
									applicationId={application.id}
									initialApproved={!!approvalStatus}
								/>
								<RefreshAndFindReplace
									applicationId={application.id}
									cacheKeys={[`${ENTRY_CACHE_KEY}:${application.id}`]}
								/>
								<ApplicationDisable
									applicationId={application.id}
									initialEnabled={application.enabled}
								/>
								<DeleteApplicationButton
									applicationId={application.id}
									applicationName={application.name}
								/>
							</div>
						</div>
					</div>
					<div className="container mx-auto px-1 py-2">
						<div className="w-full lg:w-3/4 mx-auto">
							{categories.map((category: Category) => (
								<table
									key={category.id}
									className="w-full mb-1 border-collapse border border-gray-300"
								>
									<thead>
										<tr>
											<th className="border border-gray-300 p-1 bg-gray-100 text-sm">{category.name}</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td className="border border-gray-300 p-0">
												<table className="w-full border-collapse">
													<tbody>
														{fields.map((field: Field) => (
															<tr
																key={field.id}
																className="border-b border-gray-200 last:border-b-0"
															>
																<td className="w-1/4 p-1 text-sm font-bold">{field.name}</td>
																<td className="w-3/4 p-1">
																	<LaciEntryEditor
																		applicationId={application.id}
																		categoryId={category.id}
																		fieldId={field.id}
																		initialEntry={entries.find(
																			(entry: Entry) =>
																				entry.categoryId === category.id &&
																				entry.fieldId === field.id,
																		)}
																	/>
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</td>
										</tr>
									</tbody>
								</table>
							))}
						</div>
					</div>
					<div className="h-[200px]"></div>
					<FloatingHeaderScript />
				</div>
			</LaciEditorProvider>
		);
	} catch (error) {
		console.error('Error fetching application:', error);
		return (
			<Error
				title="500"
				description={'Failed to load application!'}
				details={`${error}`}
			/>
		);
	}
}
