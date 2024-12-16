'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { Application } from '@/types';
import { ApplicationList } from '@/components/client/application-list';
import { Icon } from '@iconify/react';

export function ApplicationSearch({ initialApplications }: { initialApplications: Application[] }) {
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
	const [showFilters, setShowFilters] = useState(false);
	const [showDisabled, setShowDisabled] = useState(false);
	const [applications, setApplications] = useState(initialApplications);

	useEffect(() => {
		const fetchApplications = async () => {
			const response = await fetch(`/api/applications?showDisabled=${showDisabled}`);
			if (response.ok) {
				const data = await response.json();
				setApplications(data);
			}
		};

		fetchApplications();
	}, [showDisabled]);

	const filteredAndSortedApplications = useMemo(() => {
		return applications
			.filter((app) => app.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
			.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
	}, [applications, debouncedSearchTerm]);

	const maxHitCount = useMemo(() => Math.max(...initialApplications.map((app) => app.hitCount)), [initialApplications]);

	return (
		<>
			<div className="flex items-center mb-4">
				<input
					type="text"
					placeholder="Search applications..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full p-2 border rounded-md mr-2"
				/>
				<button
					onClick={() => setShowFilters(!showFilters)}
					className="p-2 border rounded-md"
					aria-label="Toggle filters"
				>
					<Icon
						icon="lucide:sliders-horizontal"
						width="24"
						height="24"
					/>
				</button>
			</div>
			{showFilters && (
				<div className="mb-4">
					<label className="flex items-center">
						<input
							type="checkbox"
							checked={showDisabled}
							onChange={(e) => setShowDisabled(e.target.checked)}
							className="mr-2"
						/>
						Show Disabled
					</label>
				</div>
			)}
			<ApplicationList
				applications={filteredAndSortedApplications}
				maxHitCount={maxHitCount}
			/>
		</>
	);
}
