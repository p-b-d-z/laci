'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { ReorderableItemProps } from '@/types';
import { DescriptionEditor } from './description-editor';

export const ReorderableItem: React.FC<ReorderableItemProps> = ({
	id,
	name,
	description = '',
	isFirst,
	isLast,
	onMoveUp,
	onMoveDown,
	onEdit,
}) => {
	const [showFeedback, setShowFeedback] = useState(false);
	const [isEditing, setIsEditing] = useState(false);

	const handleMove = async (direction: 'up' | 'down') => {
		await (direction === 'up' ? onMoveUp(id) : onMoveDown(id));
		setShowFeedback(true);
		setTimeout(() => setShowFeedback(false), 2000); // Hide feedback after 2 seconds
	};

	const handleEdit = async (newDescription: string) => {
		if (onEdit) {
			await onEdit(id, newDescription);
		}
	};

	return (
		<>
			<li className="flex items-center justify-between py-1">
				<span>{name}</span>
				<div className="flex space-x-2 items-center">
					{showFeedback && (
						<Icon
							icon="lucide:check-circle"
							className="text-green-500"
							width="20"
							height="20"
						/>
					)}
					{!isFirst && (
						<button
							onClick={() => handleMove('up')}
							className="p-1 hover:bg-gray-200 rounded"
						>
							<Icon
								icon="mdi:arrow-up"
								width="16"
								height="16"
							/>
						</button>
					)}
					{!isLast && (
						<button
							onClick={() => handleMove('down')}
							className="p-1 hover:bg-gray-200 rounded"
						>
							<Icon
								icon="mdi:arrow-down"
								width="16"
								height="16"
							/>
						</button>
					)}
					{onEdit && (
						<button
							onClick={() => setIsEditing(true)}
							className="p-1 hover:bg-gray-200 rounded"
						>
							<Icon
								icon="lucide:file-pen-line"
								width="16"
								height="16"
							/>
						</button>
					)}
				</div>
			</li>
			{onEdit && (
				<DescriptionEditor
					isOpen={isEditing}
					onClose={() => setIsEditing(false)}
					onSave={handleEdit}
					initialDescription={description}
				/>
			)}
		</>
	);
};
