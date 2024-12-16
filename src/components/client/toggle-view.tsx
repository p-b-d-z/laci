'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

export function ViewToggle() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const view = searchParams.get('view') ?? 'table';

	const toggleView = () => {
		const newView = view === 'table' ? 'matrix' : 'table';
		const newSearchParams = new URLSearchParams(searchParams);
		newSearchParams.set('view', newView);
		router.push(`?${newSearchParams.toString()}`);
	};

	return (
		<button
			onClick={toggleView}
			className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
			title={view === 'table' ? 'Switch to Matrix View' : 'Switch to Table View'}
		>
			{view === 'table' ? (
				<Icon
					icon="lucide:grid"
					className="w-5 h-5"
				/>
			) : (
				<Icon
					icon="lucide:list"
					className="w-5 h-5"
				/>
			)}
		</button>
	);
}
