import { getServerSession } from 'next-auth/next';
import { ENTRY_CACHE_KEY } from '@/constants';
import { LaciEntryEditor } from '@/components/client/laci-editor';
import DeleteApplicationButton from '@/components/client/application-delete';
import { RefreshAndFindReplace } from '@/components/client/refresh-and-find-replace';
import { FloatingHeaderScript } from '@/components/client/floating-header';
import { Error } from '@/components/client/error';
import { ApprovalButton } from '@/components/client/approval-button';
import ApplicationDisable from '@/components/client/application-disable';
import { LaciEditorProvider } from '@/contexts/LaciEditorContext';
import { updateCachedApplication } from '@/lib/redis/functions';
import { authOptions } from '@/lib/auth/providers';
import { Entry, Field, Category, ApplicationApproval } from '@/types';
import { headers } from 'next/headers';

export default async function ApplicationPage({ params }: { params: { guid: string } }) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return (
			<Error
				title="401"
				description="Unauthorized. Please log in."
			/>
		);
	}
	const { guid } = params;

	try {
		const headersList = headers();
		const fetchOptions = {
			headers: {
				'Content-Type': 'application/json',
				Cookie: headersList.get('cookie') || '',
			},
			cache: 'no-store' as const,
		};

		const [categoriesRes, fieldsRes, applicationRes, entriesRes, approvalRes] = await Promise.all([
			await fetch(`${process.env.NEXTAUTH_URL}/api/categories`, fetchOptions),
			await fetch(`${process.env.NEXTAUTH_URL}/api/fields`, fetchOptions),
			await fetch(`${process.env.NEXTAUTH_URL}/api/applications/${guid}`, fetchOptions),
			await fetch(`${process.env.NEXTAUTH_URL}/api/entries/${guid}`, fetchOptions),
			await fetch(`${process.env.NEXTAUTH_URL}/api/applications/approvals`, fetchOptions),
		]);

		// Check responses individually
		if (!applicationRes.ok) {
			if (applicationRes.status === 401) {
				return (
					<Error
						title="401"
						description="Unauthorized. Please log in."
					/>
				);
			}
			return (
				<Error
					title="404"
					description="Application not found!"
					details={`ID: ${guid}`}
				/>
			);
		}

		const application = await applicationRes.json();

		// Increment hit count
		application.hitCount += 1;
		await fetch(`${process.env.NEXTAUTH_URL}/api/applications/${guid}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(application),
		});

		// Check other responses
		if (!categoriesRes.ok || !fieldsRes.ok || !entriesRes.ok || !approvalRes.ok) {
			return (
				<Error
					title="404"
					description="Failed to load required data"
				/>
			);
		}

		const [categories, fields, entries, approvalData] = await Promise.all([
			categoriesRes.json(),
			fieldsRes.json(),
			entriesRes.json(),
			approvalRes.json() as Promise<ApplicationApproval[]>,
		]);

		const approvalStatus = approvalData.find((approval) => approval.applicationId === guid);

		await updateCachedApplication(application);

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
