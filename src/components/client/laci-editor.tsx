'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Entry, LaciEntryEditorProps } from '@/types';
import { useRouter } from 'next/navigation';
import { useLaciEditor } from '@/contexts/LaciEditorContext';
import { toast } from 'react-hot-toast';
import '@/styles/globals.css';
import { Icon } from '@iconify/react';

type SearchResultItem = {
	displayName: string;
	mail: string | null;
	id?: string;
	isLoading?: boolean;
};

export function LaciEntryEditor({ applicationId, categoryId, fieldId, initialEntry }: LaciEntryEditorProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [entry, setEntry] = useState<Entry | null>(initialEntry || null);
	const [assignedUsers, setAssignedUsers] = useState<string[]>(initialEntry?.assignedUsers || []);
	const [searchResults, setSearchResults] = useState<Array<Array<SearchResultItem>>>([]);
	const [isFlashing, setIsFlashing] = useState(false);
	const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
	const router = useRouter();

	const { activeEditor, setActiveEditor } = useLaciEditor();

	const editorId = `${applicationId}-${categoryId}-${fieldId}`;

	const recommendedOptions = ['Application Support', 'Business Leaders', 'Impacted'];
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

	const editorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isEditing && editorRef.current) {
			editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}, [isEditing]);

	useEffect(() => {
		if (activeEditor === editorId && !isEditing) {
			setIsFlashing(true);
			setTimeout(() => setIsFlashing(false), 500);
		}
	}, [activeEditor, editorId, isEditing]);

	const handleEdit = () => {
		if (activeEditor && activeEditor !== editorId) {
			toast.error('You can only edit one field at a time. Please finish editing the current field.');
			return;
		}
		setIsEditing(true);
		setActiveEditor(editorId);
		if (assignedUsers.length === 0) {
			setAssignedUsers(['']);
		}
		setTimeout(() => {
			if (editorRef.current) {
				editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}, 100);
	};

	const handleCancel = () => {
		setIsEditing(false);
		setActiveEditor(null);
		setAssignedUsers(initialEntry?.assignedUsers || []); // Revert to initial state
	};

	const handleSubmit = async () => {
		setIsSaving(true);
		const url = new URL(`/api/entries/${applicationId}`, window.location.origin);
		console.log('Submitting LACI entry to:', url.toString());

		// Filter out empty or whitespace-only entries
		const filteredUsers = assignedUsers.filter((user) => user.trim() !== '');

		try {
			const response = await fetch(url.toString(), {
				method: entry ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: entry?.id,
					assignedUsers: filteredUsers,
					categoryId,
					fieldId: fieldId,
				}),
			});

			if (response.ok) {
				const updatedEntry = await response.json();
				console.log('Updated LACI entry:', updatedEntry);
				setEntry(updatedEntry);
				setAssignedUsers(filteredUsers);

				// Update application
				const updateResponse = await fetch(`/api/applications/${applicationId}/update`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						updatedAt: new Date().toISOString(),
					}),
				});

				if (updateResponse.ok) {
					console.log('Application updated successfully');
				} else {
					console.error('Failed to update application');
				}

				router.refresh();
				setIsEditing(false);
				setActiveEditor(null);
			} else {
				const errorData = await response.json();
				console.error('Failed to save LACI entry:', errorData.error);
				toast.error('Failed to save LACI entry. Please try again.');
			}
		} catch (error) {
			console.error('Error saving LACI entry:', error);
			toast.error('An error occurred while saving. Please try again.');
		} finally {
			setIsSaving(false);
		}
	};

	const handleAddUser = () => {
		if (assignedUsers.length < 3) {
			setAssignedUsers([...assignedUsers, '']);
			setIsSaving(false);
		}
	};

	const handleUserChange = (index: number, value: string) => {
		const newAssignedUsers = [...assignedUsers];
		newAssignedUsers[index] = value;
		setAssignedUsers(newAssignedUsers);
	};

	const handleRemoveUser = (index: number) => {
		const newAssignedUsers = assignedUsers.filter((_, i) => i !== index);
		setAssignedUsers(newAssignedUsers.length > 0 ? newAssignedUsers : ['']);
	};

	const handleUserSearch = async (index: number, value: string) => {
		handleUserChange(index, value);

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Show loading state immediately
		setSearchResults((prev) => {
			const newResults = [...prev];
			newResults[index] = [{ displayName: 'Loading results...', mail: null, isLoading: true }];
			return newResults;
		});

		const timeout = setTimeout(async () => {
			try {
				const encodedSearch = encodeURIComponent(value);
				const response = await fetch(`/api/azure/search?q=${encodedSearch}`);
				if (!response.ok) throw new Error('Search failed');
				const data = await response.json();

				const formattedResults = data.items.map((item: { displayName: string; mail: string | null }) => ({
					displayName: item.displayName,
					mail: item.mail,
				}));

				const recommendedResults = recommendedOptions.map((option) => ({
					displayName: option,
					mail: null,
				}));

				setSearchResults((prev) => {
					const newResults = [...prev];
					newResults[index] = [...formattedResults, ...recommendedResults];
					return newResults;
				});
			} catch (error) {
				console.error('Search error:', error);
				setSearchResults((prev) => {
					const newResults = [...prev];
					newResults[index] = recommendedOptions.map((option) => ({
						displayName: option,
						mail: null,
					}));
					return newResults;
				});
			}
		}, 500);

		setSearchTimeout(timeout);
	};

	const handleSelectUser = (index: number, entity: SearchResultItem) => {
		const displayValue = entity.mail != null ? `${entity.displayName} <${entity.mail}>` : entity.displayName;

		handleUserChange(index, displayValue);
		setSearchResults((prev) => {
			const newResults = [...prev];
			newResults[index] = [];
			return newResults;
		});
	};

	const handleInputFocus = (index: number) => {
		if (searchResults[index]?.length === 0) {
			setSearchResults((prevResults) => {
				const newResults = [...prevResults];
				newResults[index] = recommendedOptions.map((option) => ({
					displayName: option,
					id: option,
					mail: null,
				}));
				return newResults;
			});
			inputRefs.current[index]?.focus();
		}
	};

	const handleEscapeKey = useCallback((event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			setSearchResults([]);
			inputRefs.current.forEach((input) => input?.blur());
		}
	}, []);

	useEffect(() => {
		document.addEventListener('keydown', handleEscapeKey);
		return () => {
			document.removeEventListener('keydown', handleEscapeKey);
		};
	}, [handleEscapeKey]);

	const handleInputBlur = (index: number) => {
		setTimeout(() => {
			setSearchResults((prevResults) => {
				const newResults = [...prevResults];
				newResults[index] = [];
				return newResults;
			});
		}, 200);
	};

	if (isEditing) {
		return (
			<div
				ref={editorRef}
				className="border-2 border-blue-500 p-4 rounded-lg"
			>
				{assignedUsers.map((user, index) => (
					<div
						key={index}
						className="flex items-center mb-2"
					>
						<div className="relative flex-grow">
							<input
								type="text"
								value={user}
								onChange={(e) => handleUserSearch(index, e.target.value)}
								onFocus={() => handleInputFocus(index)}
								onBlur={() => handleInputBlur(index)}
								ref={(el) => {
									inputRefs.current[index] = el;
								}}
								className="border p-1 mr-2 w-full text-sm"
								placeholder="Type to search for users and groups"
							/>
							{searchResults[index]?.length > 0 && (
								<ul className="absolute z-10 bg-white border border-gray-300 w-full max-h-60 overflow-y-auto">
									{searchResults[index].map((result, i) => (
										<li
											key={result.isLoading ? 'loading' : result.id || i}
											className={`p-2 ${result.isLoading ? 'text-gray-400 italic' : 'hover:bg-gray-100 cursor-pointer'} text-sm whitespace-nowrap overflow-hidden text-ellipsis`}
											onClick={() => !result.isLoading && handleSelectUser(index, result)}
										>
											{result.isLoading ? (
												<div className="flex items-center gap-2">
													<Icon
														icon="line-md:loading-twotone-loop"
														className="h-4 w-4"
													/>
													{result.displayName}
												</div>
											) : recommendedOptions.includes(result.displayName) ? (
												result.displayName
											) : (
												`${result.displayName}${result.mail ? ` <${result.mail}>` : ''}`
											)}
										</li>
									))}
								</ul>
							)}
						</div>
						<div className="flex">
							<button
								onClick={() => handleRemoveUser(index)}
								className="bg-red-500 text-white p-1 rounded-l"
								disabled={assignedUsers.length === 1}
							>
								-
							</button>
							{index === assignedUsers.length - 1 && assignedUsers.length < 3 && (
								<>
									<div className="w-1"></div>
									<button
										onClick={handleAddUser}
										className="bg-blue-500 text-white p-1 rounded-r"
									>
										+
									</button>
								</>
							)}
						</div>
					</div>
				))}
				<div className="mt-2">
					<button
						onClick={handleSubmit}
						className="bg-blue-500 text-white p-1 rounded mr-2"
						disabled={isSaving}
					>
						{isSaving ? 'Saving...' : 'Submit'}
					</button>
					<button
						onClick={handleCancel}
						className="bg-red-500 text-white p-1 rounded"
						disabled={isSaving}
					>
						Cancel
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			onClick={handleEdit}
			className={`cursor-pointer p-2 rounded-lg ${
				isFlashing
					? 'border-2 border-red-500 animate-pulse'
					: activeEditor === editorId
						? 'border-2 border-green-500 animate-pulse'
						: ''
			}`}
		>
			{assignedUsers.length > 1 ? (
				<ul className="list-disc pl-5 text-sm">
					{assignedUsers.map((user, index) => (
						<li key={index}>{user}</li>
					))}
				</ul>
			) : assignedUsers.length === 1 ? (
				<span className="text-sm">{assignedUsers[0]}</span>
			) : (
				'N/A'
			)}
		</div>
	);
}
