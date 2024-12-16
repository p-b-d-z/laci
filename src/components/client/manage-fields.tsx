'use client';

import React, { useState, useEffect } from 'react';
import { Field } from '@/types';
import { FIELDS_CACHE_KEY } from '@/constants';
import { RefreshButton } from '@/components/client/refresh-button';
import { ReorderableItem } from '@/components/client/manage-order';

export function ManageFields() {
	const [fieldName, setLaciTypeName] = useState('');
	const [fields, setLaciTypes] = useState<Field[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		fetchLaciTypes();
	}, []);

	const fetchLaciTypes = async () => {
		try {
			const response = await fetch('/api/fields');
			if (response.ok) {
				const data = await response.json();
				const sortedData = data
					.filter((laciType: Field) => laciType.id && laciType.name)
					.sort((a: Field, b: Field) => a.order - b.order);
				setLaciTypes(sortedData);
			} else {
				throw new Error('Failed to fetch LACI types');
			}
		} catch (err) {
			setError('Failed to fetch LACI types');
		}
	};

	const handleSubmitLaciType = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		try {
			const response = await fetch('/api/fields', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: fieldName }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to create LACI type');
			}

			setLaciTypeName('');
			await fetchLaciTypes();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	const handleMoveLaciType = async (id: string, direction: 'up' | 'down') => {
		const index = fields.findIndex((type) => type.id === id);
		if (index === -1) return;

		const newLaciTypes = [...fields];
		const item = newLaciTypes[index];
		const newIndex = direction === 'up' ? index - 1 : index + 1;

		if (newIndex >= 0 && newIndex < newLaciTypes.length) {
			const swappedItem = newLaciTypes[newIndex];
			newLaciTypes[newIndex] = item;
			newLaciTypes[index] = swappedItem;

			// Update order values
			newLaciTypes.forEach((type, idx) => {
				type.order = idx;
			});

			setLaciTypes(newLaciTypes);

			await Promise.all([
				updateOrder('/api/fields', item.id, item.name, item.order),
				updateOrder('/api/fields', swappedItem.id, swappedItem.name, swappedItem.order),
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
			const response = await fetch(`/api/fields/${id}/description`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ description }),
			});

			if (!response.ok) {
				throw new Error('Failed to update description');
			}

			await fetchLaciTypes();
		} catch (err) {
			setError('Failed to update description');
		}
	};

	return (
		<div className="space-y-4">
			<section className="bg-gray-100 rounded-lg p-3">
				<div className="flex justify-between items-center mb-2">
					<h2 className="text-lg font-semibold">Manage Roles</h2>
					<RefreshButton cacheKeys={[FIELDS_CACHE_KEY]} />
				</div>
				<div className="h-[22rem] overflow-y-auto">
					<ul className="space-y-0.5">
						{fields.map((laciType, index) => (
							<ReorderableItem
								key={laciType.id}
								id={laciType.id}
								name={laciType.name}
								description={laciType.description}
								order={laciType.order}
								isFirst={index === 0}
								isLast={index === fields.length - 1}
								onMoveUp={() => handleMoveLaciType(laciType.id, 'up')}
								onMoveDown={() => handleMoveLaciType(laciType.id, 'down')}
								onEdit={handleEditDescription}
							/>
						))}
					</ul>
				</div>
			</section>

			<section className="bg-gray-100 rounded-lg p-3">
				<h2 className="text-lg font-semibold mb-2">Add Role</h2>
				<form
					onSubmit={handleSubmitLaciType}
					className="space-y-2"
				>
					<input
						type="text"
						id="fieldName"
						value={fieldName}
						onChange={(e) => setLaciTypeName(e.target.value)}
						className="w-full p-1.5 border rounded"
						required
					/>
					<button
						type="submit"
						disabled={isLoading || !fieldName.trim()}
						className="w-full bg-purple-500 text-white p-1.5 rounded disabled:bg-gray-300"
					>
						{isLoading ? 'Creating...' : 'Create LACI Type'}
					</button>
				</form>
			</section>

			{error && <p className="text-red-500 mt-2">{error}</p>}
		</div>
	);
}
