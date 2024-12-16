'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { useSession } from 'next-auth/react';
import { Icon } from '@iconify/react';
import { ProgressBar } from '@/components/client/progress-bar';
import { formatNameForUrl } from '@/lib/formatting';
import { Entry, Category, Field, CustomSession, MyResponsibilitiesProps } from '@/types';

export function MyResponsibilitiesMatrix({
	userEmail,
	userName,
	showDisabled,
	selectedCategories,
	selectedFields,
}: MyResponsibilitiesProps & {
	selectedCategories: string[];
	selectedFields: string[];
}) {
	const [assignments, setAssignments] = useState<(Entry & { applicationName: string; categoryName: string; fieldName: string })[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [fields, setFields] = useState<Field[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [progress, setProgress] = useState({ processed: 0, total: 0 });
	const [error, setError] = useState<string | null>(null);
	const { data: session } = useSession() as { data: CustomSession | null };
	const [assignmentsResponseInfo, setAssignmentsResponseInfo] = useState<string>('');
	const [categoriesResponseInfo, setCategoriesResponseInfo] = useState<string>('');
	const [fieldsResponseInfo, setFieldsResponseInfo] = useState<string>('');
	const [groupedAssignments, setGroupedAssignments] = useState<
		Record<
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
		>
	>({});

	useEffect(() => {
		async function fetchData() {
			setIsLoading(true);
			setError(null);
			try {
				const [assignmentsResponse, categoriesResponse, fieldsResponse] = await Promise.all([
					fetch(
						`/api/my-responsibilities?email=${encodeURIComponent(userEmail)}${userName ? `&name=${encodeURIComponent(userName)}` : ''}&showDisabled=${showDisabled}`,
					),
					fetch('/api/categories'),
					fetch('/api/fields'),
				]);

				setAssignmentsResponseInfo(`Status: ${assignmentsResponse.status}, OK: ${assignmentsResponse.ok}`);
				setCategoriesResponseInfo(`Status: ${categoriesResponse.status}, OK: ${categoriesResponse.ok}`);
				setFieldsResponseInfo(`Status: ${fieldsResponse.status}, OK: ${fieldsResponse.ok}`);

				if (!assignmentsResponse.ok || !categoriesResponse.ok || !fieldsResponse.ok) {
					throw new Error('One or more API requests failed');
				}

				const categoriesData = await categoriesResponse.json();
				const fieldsData = await fieldsResponse.json();

				setCategoriesResponseInfo((prev) => `${prev}, Data: ${JSON.stringify(categoriesData).slice(0, 100)}...`);
				setFieldsResponseInfo((prev) => `${prev}, Data: ${JSON.stringify(fieldsData).slice(0, 100)}...`);

				setCategories(categoriesData.sort((a: Category, b: Category) => a.order - b.order));
				setFields(fieldsData.sort((a: Field, b: Field) => a.order - b.order));

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
								console.log('Received data:', data);
								switch (data.type) {
									case 'total':
										setProgress((prev) => ({ ...prev, total: data.count }));
										break;
									case 'progress':
										setProgress((prev) => ({ ...prev, processed: data.processed }));
										break;
									case 'assignments':
										const newAssignments = data.data;
										setAssignments((prev) => [...prev, ...newAssignments]);

										// Group the new assignments
										setGroupedAssignments((prevGrouped) => {
											const newGrouped = { ...prevGrouped };

											newAssignments.forEach(
												(
													assignment: Entry & {
														applicationName: string;
														categoryName: string;
														fieldName: string;
													},
												) => {
													if (!newGrouped[assignment.applicationId]) {
														newGrouped[assignment.applicationId] = {
															applicationName: assignment.applicationName,
															categories: {},
														};
													}

													if (!newGrouped[assignment.applicationId].categories[assignment.categoryId]) {
														newGrouped[assignment.applicationId].categories[assignment.categoryId] = {
															categoryName: assignment.categoryName,
															entries: {},
														};
													}

													newGrouped[assignment.applicationId].categories[assignment.categoryId].entries[
														assignment.fieldId
													] = {
														...assignment,
														fieldName: assignment.fieldName,
													};
												},
											);

											return newGrouped;
										});
										break;
									case 'done':
										setIsLoading(false);
										break;
									case 'error':
										console.error('Error from server:', data.message);
										setError(data.message);
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
				setError('Failed to fetch data. Please try again.');
				setIsLoading(false);
			}
		}

		fetchData();
	}, [showDisabled, userEmail, userName]);

	if (isLoading) {
		return (
			<div>
				<ProgressBar
					processed={progress.processed}
					total={progress.total}
				/>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<p>Error: {error}</p>
				<h3>Response Information:</h3>
				<p>Assignments: {assignmentsResponseInfo}</p>
				<p>Categories: {categoriesResponseInfo}</p>
				<p>Fields: {fieldsResponseInfo}</p>
			</div>
		);
	}

	if (assignments.length === 0) {
		return (
			<div>
				<p>No assignments found.</p>
			</div>
		);
	}

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

	const filteredCategories = categories.filter((category) => selectedCategories.length === 0 || selectedCategories.includes(category.id));

	const filteredFields = fields.filter((field) => selectedFields.length === 0 || selectedFields.includes(field.id));

	const hasVisibleAssignments = (categoryData: { categoryName: string; entries: Record<string, Entry & { fieldName: string }> }) => {
		return filteredFields.some((field) => {
			const entry = categoryData.entries[field.id];
			return entry && (isIndividualResponsibility(entry) || isGroupResponsibility(entry));
		});
	};

	return (
		<div className="w-full lg:w-3/4 mx-auto">
			<div className="overflow-x-auto">
				<table className="min-w-full border-collapse">
					<thead>
						<tr>
							<th className="border p-2">Service Roles</th>
							{filteredFields.map((field) => (
								<th
									key={field.id}
									className="border p-2"
								>
									{field.name}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{sortedGroupedAssignments.map(([applicationId, appData]) => {
							// Check if this application has any visible assignments
							const hasAnyVisibleAssignments = filteredCategories.some((category) => {
								const categoryData = appData.categories[category.id];
								return categoryData && hasVisibleAssignments(categoryData);
							});

							// Skip rendering this application if it has no visible assignments
							if (!hasAnyVisibleAssignments) return null;

							return (
								<React.Fragment key={applicationId}>
									<tr className="bg-gray-100">
										<td
											colSpan={filteredFields.length + 1}
											className="border p-2 font-bold"
										>
											<div className="flex items-center justify-between">
												<span>{appData.applicationName}</span>
												<a
													href={`/dashboard/application/${formatNameForUrl(appData.applicationName)}`}
													className="ml-2 text-blue-500 hover:text-blue-700"
												>
													<Icon
														icon="lucide:square-arrow-out-up-right"
														width="20"
														height="20"
													/>
												</a>
											</div>
										</td>
									</tr>
									{filteredCategories.map((category) => {
										const categoryData = appData.categories[category.id];
										if (!categoryData) return null;

										// Skip categories that have no visible assignments
										if (!hasVisibleAssignments(categoryData)) return null;

										return (
											<tr key={`${applicationId}-${category.id}`}>
												<td className="border p-2">{category.name}</td>
												{filteredFields.map((field) => (
													<td
														key={`${applicationId}-${category.id}-${field.id}`}
														className="border p-2 text-center"
													>
														{categoryData.entries[field.id] && (
															<div className="flex justify-center items-center space-x-1">
																{isIndividualResponsibility(categoryData.entries[field.id]) && (
																	<div
																		className="w-4 h-4 bg-blue-500 rounded-full"
																		title="Individual"
																	></div>
																)}
																{isGroupResponsibility(categoryData.entries[field.id]) && (
																	<div
																		className="w-4 h-4 bg-green-500 rounded-full"
																		title="Group"
																	></div>
																)}
															</div>
														)}
													</td>
												))}
											</tr>
										);
									})}
								</React.Fragment>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
