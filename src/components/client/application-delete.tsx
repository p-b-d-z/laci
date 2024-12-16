'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/client/modal';
import { DeleteApplicationButtonProps } from '@/types';
import { toast } from 'react-hot-toast';

export default function DeleteApplicationButton({ applicationId, applicationName }: DeleteApplicationButtonProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);
	const router = useRouter();

	useEffect(() => {
		const checkAdminStatus = async () => {
			try {
				const response = await fetch('/api/auth/admin');
				const data = await response.json();
				setIsAdmin(data.isAdmin);
			} catch (error) {
				console.error('Error checking admin status:', error);
				setIsAdmin(false);
			}
		};
		checkAdminStatus();
	}, []);

	const handleDelete = async () => {
		if (!isAdmin) {
			toast.error('You do not have permission to delete applications');
			return;
		}

		setIsDeleting(true);
		try {
			const response = await fetch(`/api/applications/${applicationId}/delete`, {
				method: 'DELETE',
			});

			if (response.ok) {
				toast.success('Application deleted successfully');
				setTimeout(() => {
					router.push('/dashboard/applications');
					router.refresh();
				}, 1000);
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete application');
			}
		} catch (error) {
			console.error('Error deleting application:', error);
			toast.error(error instanceof Error ? error.message : 'An error occurred while deleting the application');
		} finally {
			setIsDeleting(false);
			setIsModalOpen(false);
		}
	};

	return (
		<>
			<button
				onClick={() => setIsModalOpen(true)}
				className="text-red-600 hover:text-red-800 disabled:text-red-300"
				aria-label="Delete application"
				disabled={!isAdmin}
				title={!isAdmin ? 'Only administrators can delete applications' : 'Delete application'}
			>
				<Icon
					icon="lucide:trash-2"
					width="24"
					height="24"
				/>
			</button>
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			>
				<h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
				<p className="mb-4">Are you sure you want to delete the application {applicationName}?</p>
				<div className="flex justify-end space-x-2">
					<button
						onClick={() => setIsModalOpen(false)}
						className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
						disabled={isDeleting}
					>
						Cancel
					</button>
					<button
						onClick={handleDelete}
						className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400"
						disabled={isDeleting || !isAdmin}
					>
						{isDeleting ? 'Deleting...' : 'Delete'}
					</button>
				</div>
			</Modal>
		</>
	);
}
