'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { AssignedUserSwap } from '@/components/client/assigned-user-swap';
import { FindReplaceModalProps } from '@/types';

export default function FindReplaceModal({ applicationId, children, onSuccess }: FindReplaceModalProps & { onSuccess?: () => void }) {
	const [isOpen, setIsOpen] = useState(false);

	const handleClose = () => {
		setIsOpen(false);
		if (onSuccess) {
			onSuccess();
		}
	};

	return (
		<>
			<button
				onClick={() => setIsOpen(true)}
				className="p-2 bg-white text-black rounded hover:bg-gray-100"
				title="Find and Replace"
			>
				{children}
			</button>
			{isOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-gray-100 rounded-lg w-full max-w-md shadow-lg">
						<div className="bg-gray-200 px-4 py-2 flex justify-between items-center">
							<h2 className="text-lg font-semibold">Find and Replace User</h2>
							<button
								onClick={handleClose}
								className="text-gray-600 hover:text-gray-800"
								aria-label="Close"
							>
								<Icon
									icon="lucide:x"
									className="w-6 h-6"
								/>
							</button>
						</div>
						<div className="p-6 overflow-visible">
							<AssignedUserSwap
								applicationId={applicationId}
								onSuccess={handleClose}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
