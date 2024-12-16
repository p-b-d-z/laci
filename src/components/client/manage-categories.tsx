'use client';

import React, { useState, useEffect } from 'react';
import { Category } from '@/types';
import { CATEGORIES_CACHE_KEY } from '@/constants';
import { RefreshButton } from '@/components/client/refresh-button';
import { ReorderableItem } from '@/components/client/manage-order';

export function ManageCategories() {
	const [categoryName, setCategoryName] = useState('');
	const [categories, setCategories] = useState<Category[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		fetchCategories();
	}, []);

	const fetchCategories = async () => {
		try {
			const response = await fetch('/api/categories');
			if (response.ok) {
				const data = await response.json();
				const sortedData = data
					.filter((category: Category) => category.id && category.name)
					.sort((a: Category, b: Category) => a.order - b.order);
				setCategories(sortedData);
			} else {
				throw new Error('Failed to fetch categories');
			}
		} catch (err) {
			setError('Failed to fetch categories');
		}
	};

	const handleSubmitCategory = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		try {
			const response = await fetch('/api/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: categoryName }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to create category');
			}

			setCategoryName('');
			await fetchCategories();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	const handleMoveCategory = async (id: string, direction: 'up' | 'down') => {
		const index = categories.findIndex((cat) => cat.id === id);
		if (index === -1) return;

		const newCategories = [...categories];
		const item = newCategories[index];
		const newIndex = direction === 'up' ? index - 1 : index + 1;

		if (newIndex >= 0 && newIndex < newCategories.length) {
			const swappedItem = newCategories[newIndex];
			newCategories[newIndex] = item;
			newCategories[index] = swappedItem;

			newCategories.forEach((cat, idx) => {
				cat.order = newCategories.length - 1 - idx;
			});

			setCategories(newCategories);

			await Promise.all([
				updateOrder('/api/categories', item.id, item.name, item.order),
				updateOrder('/api/categories', swappedItem.id, swappedItem.name, swappedItem.order),
			]);
		}
	};

	const updateOrder = async (url: string, id: string, name: string, newOrder: number) => {
		try {
			const response = await fetch(`${url}/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, order: newOrder }),
			});

			if (!response.ok) {
				throw new Error('Failed to update order');
			}
		} catch (err) {
			setError('Failed to update order');
		}
	};

	const handleEditDescription = async (id: string, description: string) => {
		try {
			const response = await fetch(`/api/categories/${id}/description`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ description }),
			});

			if (!response.ok) {
				throw new Error('Failed to update description');
			}

			await fetchCategories();
		} catch (err) {
			setError('Failed to update description');
		}
	};

	return (
		<div className="space-y-4">
			<section className="bg-gray-100 rounded-lg p-3">
				<div className="flex justify-between items-center mb-2">
					<h2 className="text-lg font-semibold">Manage Responsibilities</h2>
					<RefreshButton cacheKeys={[CATEGORIES_CACHE_KEY]} />
				</div>
				<div className="h-[22rem] overflow-y-auto">
					<ul className="space-y-0.5">
						{categories.map((category, index) => (
							<ReorderableItem
								key={category.id}
								id={category.id}
								name={category.name}
								description={category.description}
								order={category.order}
								isFirst={index === 0}
								isLast={index === categories.length - 1}
								onMoveUp={(id) => handleMoveCategory(id, 'up')}
								onMoveDown={(id) => handleMoveCategory(id, 'down')}
								onEdit={handleEditDescription}
							/>
						))}
					</ul>
				</div>
			</section>

			<section className="bg-gray-100 rounded-lg p-3">
				<h2 className="text-lg font-semibold mb-2">Add Responsibility</h2>
				<form
					onSubmit={handleSubmitCategory}
					className="space-y-2"
				>
					<input
						type="text"
						id="categoryName"
						value={categoryName}
						onChange={(e) => setCategoryName(e.target.value)}
						className="w-full p-1.5 border rounded"
						required
					/>
					<button
						type="submit"
						disabled={isLoading || !categoryName.trim()}
						className="w-full bg-green-500 text-white p-1.5 rounded disabled:bg-gray-300"
					>
						{isLoading ? 'Creating...' : 'Create Category'}
					</button>
				</form>
			</section>

			{error && <p className="text-red-500 mt-2">{error}</p>}
		</div>
	);
}
