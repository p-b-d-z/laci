'use client';

import React, { useState } from 'react';
import Modal from './modal';

interface DescriptionEditorProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (description: string) => Promise<void>;
	initialDescription: string;
}

export function DescriptionEditor({ isOpen, onClose, onSave, initialDescription }: DescriptionEditorProps) {
	const [description, setDescription] = useState(initialDescription);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const handleSave = async () => {
		setIsLoading(true);
		setError('');
		try {
			await onSave(description);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save description');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
		>
			<div className="w-[500px] space-y-4">
				<h2 className="text-lg font-semibold">Edit Description</h2>
				<textarea
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					className="w-full h-32 p-2 border rounded resize-none"
					placeholder="Enter description..."
				/>
				{error && <p className="text-red-500">{error}</p>}
				<div className="flex justify-end space-x-2">
					<button
						onClick={onClose}
						className="px-4 py-2 border rounded hover:bg-gray-100"
						disabled={isLoading}
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
						disabled={isLoading}
					>
						{isLoading ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
		</Modal>
	);
}
