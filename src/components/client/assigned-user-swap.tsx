'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AzureEntity } from '@/types';
import { toast } from 'react-hot-toast';
import { Icon } from '@iconify/react';

type SearchResponse = {
	id?: string;
	displayName: string;
	mail?: string;
	userPrincipalName?: string;
};

export function AssignedUserSwap({ applicationId, onSuccess }: { applicationId?: string; onSuccess?: () => void }) {
	const [findUser, setFindUser] = useState('');
	const [replaceUser, setReplaceUser] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [findSearchResults, setFindSearchResults] = useState<AzureEntity[]>([]);
	const [replaceSearchResults, setReplaceSearchResults] = useState<AzureEntity[]>([]);
	const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const endpoint = applicationId ? `/api/entries/${applicationId}/find-replace` : '/api/entries/find-replace';

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ findUser, replaceUser }),
			});

			if (response.ok) {
				const result = await response.json();
				const message = applicationId
					? `Successfully replaced ${result.replacedCount} occurrences.`
					: `Successfully replaced ${result.replacedCount} occurrences across all applications.`;
				toast.success(message);
				router.refresh();
				if (onSuccess) onSuccess();
			} else {
				const error = await response.json();
				toast.error(`Error: ${error.message}`);
			}
		} catch (error) {
			toast.error('An error occurred while processing the request.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleUserSearch = async (
		value: string,
		setUser: React.Dispatch<React.SetStateAction<string>>,
		setSearchResults: React.Dispatch<React.SetStateAction<AzureEntity[]>>,
	) => {
		setUser(value);

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		setSearchResults([
			{
				id: 'loading',
				displayName: 'Loading results...',
				mail: null,
				userPrincipalName: undefined,
			},
		]);

		const timeout = setTimeout(async () => {
			if (value.length >= 2) {
				try {
					const encodedSearch = encodeURIComponent(value);
					const response = await fetch(`/api/azure/search?q=${encodedSearch}`);
					if (!response.ok) throw new Error('Search failed');
					const data = await response.json();

					const formattedResults = data.items.map((item: SearchResponse) => ({
						id: item.id || item.displayName,
						displayName: item.displayName,
						mail: item.mail || null,
						userPrincipalName: item.userPrincipalName || undefined,
					}));

					setSearchResults(formattedResults);
				} catch (error) {
					console.error('Search error:', error);
					setSearchResults([]);
					toast.error('Failed to fetch search results');
				}
			} else {
				setSearchResults([]);
			}
		}, 500);

		setSearchTimeout(timeout);
	};

	const handleSelectUser = (
		entity: AzureEntity,
		setUser: React.Dispatch<React.SetStateAction<string>>,
		setSearchResults: React.Dispatch<React.SetStateAction<AzureEntity[]>>,
	) => {
		const email = entity.mail || entity.userPrincipalName;
		const displayValue = email ? `${entity.displayName} <${email}>` : entity.displayName;
		setUser(displayValue);
		setSearchResults([]);
	};

	const handleInputBlur = (setSearchResults: React.Dispatch<React.SetStateAction<AzureEntity[]>>) => {
		setTimeout(() => {
			setSearchResults([]);
		}, 200);
	};

	return (
		<div className="bg-gray-100 rounded-lg p-4">
			<div className="flex justify-between items-center mb-2">
				<h2 className="text-lg font-semibold">Trading Places</h2>
			</div>
			<form
				onSubmit={handleSubmit}
				className="space-y-4"
			>
				<div className="relative">
					<label
						htmlFor="findUser"
						className="block mb-1"
					>
						Find User:
					</label>
					<input
						type="text"
						id="findUser"
						value={findUser}
						onChange={(e) => handleUserSearch(e.target.value, setFindUser, setFindSearchResults)}
						onBlur={() => handleInputBlur(setFindSearchResults)}
						className="w-full p-2 border rounded"
						required
						disabled={isLoading}
					/>
					{findSearchResults.length > 0 && (
						<ul className="absolute z-50 bg-white border border-gray-300 w-full max-h-60 overflow-y-auto">
							{findSearchResults.map((result) => (
								<li
									key={result.id}
									className={`p-2 ${result.id === 'loading' ? 'text-gray-400 italic' : 'hover:bg-gray-100 cursor-pointer'} text-sm whitespace-nowrap overflow-hidden text-ellipsis`}
									onClick={() => result.id !== 'loading' && handleSelectUser(result, setFindUser, setFindSearchResults)}
								>
									{result.id === 'loading' ? (
										<div className="flex items-center gap-2">
											<Icon
												icon="line-md:loading-twotone-loop"
												className="h-4 w-4"
											/>
											{result.displayName}
										</div>
									) : (
										`${result.displayName}${result.mail || result.userPrincipalName ? ` <${result.mail || result.userPrincipalName}>` : ''}`
									)}
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="relative">
					<label
						htmlFor="replaceUser"
						className="block mb-1"
					>
						Replace With:
					</label>
					<input
						type="text"
						id="replaceUser"
						value={replaceUser}
						onChange={(e) => handleUserSearch(e.target.value, setReplaceUser, setReplaceSearchResults)}
						onBlur={() => handleInputBlur(setReplaceSearchResults)}
						className="w-full p-2 border rounded"
						required
						disabled={isLoading}
					/>
					{replaceSearchResults.length > 0 && (
						<ul className="absolute z-50 bg-white border border-gray-300 w-full max-h-60 overflow-y-auto">
							{replaceSearchResults.map((result) => (
								<li
									key={result.id}
									className={`p-2 ${result.id === 'loading' ? 'text-gray-400 italic' : 'hover:bg-gray-100 cursor-pointer'} text-sm whitespace-nowrap overflow-hidden text-ellipsis`}
									onClick={() =>
										result.id !== 'loading' && handleSelectUser(result, setReplaceUser, setReplaceSearchResults)
									}
								>
									{result.id === 'loading' ? (
										<div className="flex items-center gap-2">
											<Icon
												icon="line-md:loading-twotone-loop"
												className="h-4 w-4"
											/>
											{result.displayName}
										</div>
									) : (
										`${result.displayName}${result.mail || result.userPrincipalName ? ` <${result.mail || result.userPrincipalName}>` : ''}`
									)}
								</li>
							))}
						</ul>
					)}
				</div>
				<button
					type="submit"
					disabled={isLoading}
					className="w-full bg-blue-500 text-white p-2 rounded disabled:bg-gray-300"
				>
					{isLoading ? 'Loading...' : applicationId ? 'Execute Swap' : 'Execute Global Swap'}
				</button>
			</form>
		</div>
	);
}
