'use client';

import { useState, useEffect } from 'react';
import { Entry, Category, Field, CustomSession, MyResponsibilitiesProps } from '@/types';
import { Icon } from '@iconify/react';
import { useSession } from 'next-auth/react';
import { ProgressBar } from '@/components/client/progress-bar';
import { formatNameForUrl } from '@/lib/formatting';

export function MyResponsibilitiesTable({
	userEmail,
	userName,
	showDisabled,
	selectedCategories,
	selectedFields,
}: MyResponsibilitiesProps & {
	selectedCategories: string[];
	selectedFields: string[];
}) {
	const [assignments, setAssignments] = useState<Entry[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [laciFields, setLaciFields] = useState<Field[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({});
	const [progress, setProgress] = useState({ processed: 0, total: 0 });
	const { data: session } = useSession() as { data: CustomSession | null };

	useEffect(() => {
		async function fetchData() {
			setIsLoading(true);
			try {
				const [assignmentsResponse, categoriesResponse, fieldsResponse] = await Promise.all([
					fetch(
						`/api/my-responsibilities?email=${encodeURIComponent(userEmail)}${userName ? `&name=${encodeURIComponent(userName)}` : ''}&showDisabled=${showDisabled}`,
					),
					fetch('/api/categories'),
					fetch('/api/fields'),
				]);

				const categoriesData = await categoriesResponse.json();
				const fieldsData = await fieldsResponse.json();

				// Update the sorting order for fields
				setCategories(categoriesData.sort((a: Category, b: Category) => a.order - b.order));
				setLaciFields(fieldsData.sort((a: Field, b: Field) => a.order - b.order));

				if (assignmentsResponse.body) {
					const reader = assignmentsResponse.body.getReader();
					const decoder = new TextDecoder();
					let buffer = '';

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						buffer += decoder.decode(value, { stream: true });
						const lines = buffer.split('\n');
						buffer = lines.pop() || '';

						for (const line of lines) {
							try {
								const data = JSON.parse(line);
								switch (data.type) {
									case 'total':
										setProgress((prev) => ({ ...prev, total: data.count }));
										break;
									case 'progress':
										setProgress((prev) => ({ ...prev, processed: data.processed }));
										break;
									case 'assignments':
										setAssignments((prev) => [...prev, ...data.data]);
										break;
									case 'done':
										setIsLoading(false);
										break;
									case 'error':
										console.error('Error from server:', data.message);
										setIsLoading(false);
										break;
								}
							} catch (e) {
								console.error('Error parsing JSON:', e);
							}
						}
					}
				}
			} catch (error) {
				console.error('Error fetching data:', error);
				setIsLoading(false);
			}
		}

		fetchData();
	}, [showDisabled, userEmail, userName]);

	if (isLoading) {
		return (
			<ProgressBar
				processed={progress.processed}
				total={progress.total}
			/>
		);
	}

	if (assignments.length === 0) {
		return <div>No assignments found.</div>;
	}

	const groupedAssignments = assignments.reduce(
		(acc, assignment) => {
			if (!acc[assignment.applicationId]) {
				acc[assignment.applicationId] = {
					applicationName: assignment.applicationName || '',
					categories: {},
				};
			}
			if (!acc[assignment.applicationId].categories[assignment.categoryId]) {
				acc[assignment.applicationId].categories[assignment.categoryId] = {
					categoryName: assignment.categoryName || '',
					entries: {},
				};
			}
			acc[assignment.applicationId].categories[assignment.categoryId].entries[assignment.fieldId] = {
				...assignment,
				fieldName: assignment.fieldName || 'Unknown',
			};
			return acc;
		},
		{} as Record<
			string,
			{
				applicationName: string;
				categories: Record<
					string,
					{
						categoryName: string;
						entries: Record<string, Entry & { fieldName: string }>;
					}
				>;
			}
		>,
	);

	const toggleExpand = (applicationId: string) => {
		setExpandedApps((prev) => ({
			...prev,
			[applicationId]: !prev[applicationId],
		}));
	};

	const sortedGroupedAssignments = Object.entries(groupedAssignments).sort(([, a], [, b]) =>
		a.applicationName.localeCompare(b.applicationName),
	);

	const isIndividualResponsibility = (assignment: Entry) => {
		return assignment.assignedUsers.some(
			(user) =>
				user.toLowerCase().includes(userEmail.toLowerCase()) || (userName && user.toLowerCase().includes(userName.toLowerCase())),
		);
	};

	const isGroupResponsibility = (assignment: Entry) => {
		const userGroups = session?.user?.groups || [];
		return assignment.assignedUsers.some((user) =>
			userGroups.some((group: string) => user.toLowerCase().includes(group.toLowerCase())),
		);
	};

	return (
		<div className="w-full lg:w-3/4 mx-auto">
			<div>
				{sortedGroupedAssignments.map(([applicationId, appData]) => {
					const filteredCategories = categories.filter(
						(category) => selectedCategories.length === 0 || selectedCategories.includes(category.id),
					);

					const filteredFields = laciFields.filter((field) => selectedFields.length === 0 || selectedFields.includes(field.id));

					// Only show applications that have visible assignments after filtering
					const hasVisibleAssignments = filteredCategories.some((category) => {
						const categoryData = appData.categories[category.id];
						if (!categoryData) return false;

						return filteredFields.some((field) => {
							const assignment = categoryData.entries[field.id];
							if (!assignment) return false;
							return isIndividualResponsibility(assignment) || isGroupResponsibility(assignment);
						});
					});

					if (!hasVisibleAssignments) return null;

					const assignmentCount = Object.values(appData.categories).reduce(
						(total, category) => total + Object.keys(category.entries).length,
						0,
					);
					return (
						<div
							key={applicationId}
							className="mb-4 border rounded-lg overflow-hidden"
						>
							<div className="flex justify-between items-center px-4 py-2 bg-gray-100">
								<button
									onClick={() => toggleExpand(applicationId)}
									className="flex-grow text-left focus:outline-none"
								>
									<h2 className="text-xl font-bold flex items-center">
										{appData.applicationName}
										<span className="text-sm text-gray-600 ml-2">({assignmentCount})</span>
									</h2>
								</button>
								<a
									href={`/dashboard/application/${formatNameForUrl(appData.applicationName)}`}
									className="ml-2 text-blue-500 hover:text-blue-700"
									onClick={(e) => e.stopPropagation()}
								>
									<Icon
										icon="lucide:square-arrow-out-up-right"
										width="20"
										height="20"
									/>
								</a>
							</div>
							{expandedApps[applicationId] && (
								<div className="p-4">
									{filteredCategories.map((category) => {
										const categoryData = appData.categories[category.id];
										if (!categoryData) return null;

										const hasAssignments = filteredFields.some(
											(field) =>
												categoryData.entries[field.id] &&
												(isIndividualResponsibility(categoryData.entries[field.id]) ||
													isGroupResponsibility(categoryData.entries[field.id])),
										);

										if (!hasAssignments) return null;

										return (
											<div
												key={`${applicationId}-${category.id}`}
												className="mb-4"
											>
												<h3 className="text-lg font-semibold mb-2">{category.name}</h3>
												<table className="min-w-full bg-white">
													<thead>
														<tr>
															<th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
																Roles
															</th>
															<th className="px-6 py-3 border-b-2 border-gray-300 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
																Individual Responsibilities
															</th>
															<th className="px-6 py-3 border-b-2 border-gray-300 text-center text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
																Group Responsibilities
															</th>
														</tr>
													</thead>
													<tbody>
														{filteredFields.map((field) => {
															const assignment = categoryData.entries[field.id];
															if (!assignment) return null;

															const isIndividual = isIndividualResponsibility(assignment);
															const isGroup = isGroupResponsibility(assignment);

															if (!isIndividual && !isGroup) return null;

															return (
																<tr key={`${applicationId}-${category.id}-${field.id}`}>
																	<td className="px-6 py-4 whitespace-no-wrap border-b border-gray-300">
																		{field.name}
																	</td>
																	<td className="px-6 py-4 whitespace-no-wrap border-b border-gray-300 text-center">
																		{isIndividual ? (
																			<div
																				className="w-4 h-4 bg-blue-500 rounded-full mx-auto"
																				title="Individual"
																			></div>
																		) : null}
																	</td>
																	<td className="px-6 py-4 whitespace-no-wrap border-b border-gray-300 text-center">
																		{isGroup ? (
																			<div
																				className="w-4 h-4 bg-green-500 rounded-full mx-auto"
																				title="Group"
																			></div>
																		) : null}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
