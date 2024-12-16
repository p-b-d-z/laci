'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Icon } from '@iconify/react';
import { Approver, AzureEntity } from '@/types';
import { APPROVERS_CACHE_KEY } from '@/constants';

export function Approvers() {
	const [approvers, setApprovers] = useState<Approver[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [searchResults, setSearchResults] = useState<AzureEntity[]>([]);
	const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

	async function fetchApprovers() {
		setIsLoading(true);
		try {
			const response = await fetch('/api/approvers');
			if (response.ok) {
				const data = await response.json();
				setApprovers(data);
			}
		} catch (error) {
			toast.error('Failed to load approvers');
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		fetchApprovers();

		const handleRefresh = ((event: Event) => {
			const customEvent = event as CustomEvent<string[]>;
			if (customEvent.detail.includes(APPROVERS_CACHE_KEY)) {
				fetchApprovers();
			}
		}) as EventListener;

		document.addEventListener('refreshData', handleRefresh);
		return () => document.removeEventListener('refreshData', handleRefresh);
	}, []);

	const handleSearch = async (value: string) => {
		setSearch(value);

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		const timeout = setTimeout(async () => {
			if (value.length >= 2) {
				try {
					const encodedSearch = encodeURIComponent(value);
					const response = await fetch(`/api/azure/search?q=${encodedSearch}`);

					if (!response.ok) throw new Error('Search failed');

					const data = await response.json();
					const results = data.items.map((item: { displayName: string; mail: string | null }) => ({
						displayName: item.displayName,
						mail: item.mail,
					}));

					setSearchResults(results);
				} catch (error) {
					console.error('Search error:', error);
					setSearchResults([]);
				}
			} else {
				setSearchResults([]);
			}
		}, 500);

		setSearchTimeout(timeout);
	};

	const addApprover = async (entity: AzureEntity) => {
		const response = await fetch('/api/approvers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: entity.userPrincipalName ? 'user' : 'group',
				displayName: entity.displayName,
				identifier: entity.userPrincipalName || entity.mail || entity.displayName,
			}),
		});

		if (response.ok) {
			await fetchApprovers(); // Fetch fresh data instead of updating state
			toast.success('Approver added successfully');
			setSearch('');
			setSearchResults([]);
		} else {
			toast.error('Failed to add approver');
			setSearchResults([]);
		}
	};

	const removeApprover = async (id: string) => {
		const response = await fetch('/api/approvers', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id }),
		});

		if (response.ok) {
			setApprovers((prev) => prev.filter((a) => a.id !== id));
			toast.success('Approver removed successfully');
		} else {
			toast.error('Failed to remove approver');
		}
	};

	return (
		<div className="space-y-6">
			<div className="relative">
				<input
					type="text"
					value={search}
					onChange={(e) => handleSearch(e.target.value)}
					placeholder="Search users or groups..."
					className="w-full p-2 border rounded"
					ref={inputRef}
				/>
				{searchResults.length > 0 && (
					<ul className="absolute z-10 w-full bg-white border rounded-b shadow-lg">
						{searchResults.map((result) => (
							<li
								key={result.id}
								className="p-2 hover:bg-gray-100 cursor-pointer"
								onClick={() => addApprover(result)}
							>
								{result.displayName}
								{result.mail && result.mail !== 'undefined' && (
									<span className="text-gray-500 ml-2">&lt;{result.mail}&gt;</span>
								)}
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="bg-white rounded-lg shadow">
				<table className="min-w-full">
					<thead>
						<tr>
							<th className="px-6 py-3 border-b text-left">Name</th>
							<th className="px-6 py-3 border-b text-left">Type</th>
							<th className="px-6 py-3 border-b text-left">Identifier</th>
							<th className="px-6 py-3 border-b text-left">Actions</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td
									colSpan={4}
									className="px-6 py-4 text-center"
								>
									Loading approvers...
								</td>
							</tr>
						) : (
							approvers.map((approver) => (
								<tr key={approver.id}>
									<td className="px-6 py-4">{approver.displayName}</td>
									<td className="px-6 py-4">{approver.type}</td>
									<td className="px-6 py-4">{approver.identifier}</td>
									<td className="px-6 py-4">
										<button
											onClick={() => removeApprover(approver.id)}
											className="text-red-600 hover:text-red-800"
										>
											<Icon
												icon="mdi:trash"
												className="h-5 w-5"
											/>
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
