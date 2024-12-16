'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { DisableApplicationButtonProps } from '@/types';
import { toast } from 'react-hot-toast';

export default function ApplicationDisable({ applicationId, initialEnabled }: DisableApplicationButtonProps) {
	const [isEnabled, setIsEnabled] = useState(initialEnabled);
	const [isUpdating, setIsUpdating] = useState(false);
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

	const handleToggle = async () => {
		if (!isAdmin) {
			toast.error('You do not have permission to modify applications');
			return;
		}

		setIsUpdating(true);
		try {
			const response = await fetch(`/api/applications/${applicationId}/update`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ enabled: !isEnabled }),
			});

			if (response.ok) {
				setIsEnabled(!isEnabled);
				toast.success(`Application ${!isEnabled ? 'enabled' : 'disabled'} successfully`);
				router.refresh();
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update application');
			}
		} catch (error) {
			console.error('Error updating application:', error);
			toast.error(error instanceof Error ? error.message : 'An error occurred while updating the application');
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<button
			onClick={handleToggle}
			className={`${isEnabled ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'} 
				${!isAdmin && 'opacity-50 cursor-not-allowed'}`}
			aria-label={`${isEnabled ? 'Disable' : 'Enable'} application`}
			disabled={isUpdating || !isAdmin}
			title={!isAdmin ? 'Only administrators can modify applications' : `${isEnabled ? 'Disable' : 'Enable'} application`}
		>
			<Icon
				icon={isEnabled ? 'lucide:eye' : 'lucide:eye-off'}
				width="24"
				height="24"
			/>
		</button>
	);
}
