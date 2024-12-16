'use client';

import { Icon } from '@iconify/react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Category, Field } from '@/types';
import { useState } from 'react';

type FilterButtonsProps = {
	categories: Category[];
	fields: Field[];
};

export function FilterButtons({ categories, fields }: FilterButtonsProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [closeTimeouts, setCloseTimeouts] = useState<{ [key: string]: NodeJS.Timeout }>({});

	const selectedCategories = searchParams.get('categories')?.split(',').filter(Boolean) ?? [];
	const selectedFields = searchParams.get('fields')?.split(',').filter(Boolean) ?? [];

	const handleMouseEnter = (menuId: string) => {
		if (closeTimeouts[menuId]) {
			clearTimeout(closeTimeouts[menuId]);
			const newTimeouts = { ...closeTimeouts };
			delete newTimeouts[menuId];
			setCloseTimeouts(newTimeouts);
		}
	};

	const handleMouseLeave = (menuId: string) => {
		const timeout = setTimeout(() => {
			const newTimeouts = { ...closeTimeouts };
			delete newTimeouts[menuId];
			setCloseTimeouts(newTimeouts);
		}, 300); // 300ms delay before closing

		setCloseTimeouts((prev) => ({
			...prev,
			[menuId]: timeout,
		}));
	};

	const updateFilters = (type: 'categories' | 'fields', id: string) => {
		const params = new URLSearchParams(searchParams.toString());
		const currentSelection = params.get(type)?.split(',').filter(Boolean) ?? [];

		let newSelection: string[];
		if (id === 'all') {
			newSelection = [];
		} else {
			newSelection = currentSelection.includes(id) ? currentSelection.filter((item) => item !== id) : [...currentSelection, id];
		}

		if (newSelection.length > 0) {
			params.set(type, newSelection.join(','));
		} else {
			params.delete(type);
		}

		router.push(`${pathname}?${params.toString()}`);
	};

	const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
	const sortedFields = [...fields].sort((a, b) => a.order - b.order);

	return (
		<div className="flex space-x-2">
			<div
				className="relative group"
				onMouseEnter={() => handleMouseEnter('fields')}
				onMouseLeave={() => handleMouseLeave('fields')}
			>
				<button className="p-2 hover:bg-gray-100 rounded">
					<Icon
						icon="lucide:arrow-right-from-line"
						className="h-5 w-5"
					/>
				</button>
				<div className="absolute right-0 mt-0 w-48 bg-white border rounded-md shadow-lg hidden group-hover:block z-50">
					<div className="py-1">
						<label className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
							<input
								type="checkbox"
								checked={selectedFields.length === 0}
								onChange={() => updateFilters('fields', 'all')}
								className="mr-2"
							/>
							All Roles
						</label>
						{sortedFields.map((field) => (
							<label
								key={field.id}
								className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
							>
								<input
									type="checkbox"
									checked={selectedFields.includes(field.id)}
									onChange={() => updateFilters('fields', field.id)}
									className="mr-2"
								/>
								{field.name}
							</label>
						))}
					</div>
				</div>
			</div>

			<div
				className="relative group"
				onMouseEnter={() => handleMouseEnter('categories')}
				onMouseLeave={() => handleMouseLeave('categories')}
			>
				<button className="p-2 hover:bg-gray-100 rounded">
					<Icon
						icon="lucide:arrow-down-to-line"
						className="h-5 w-5"
					/>
				</button>
				<div className="absolute right-0 mt-0 w-48 bg-white border rounded-md shadow-lg hidden group-hover:block z-50">
					<div className="py-1">
						<label className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
							<input
								type="checkbox"
								checked={selectedCategories.length === 0}
								onChange={() => updateFilters('categories', 'all')}
								className="mr-2"
							/>
							All Responsibilities
						</label>
						{sortedCategories.map((category) => (
							<label
								key={category.id}
								className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
							>
								<input
									type="checkbox"
									checked={selectedCategories.includes(category.id)}
									onChange={() => updateFilters('categories', category.id)}
									className="mr-2"
								/>
								{category.name}
							</label>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
