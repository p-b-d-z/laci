'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { ApprovalButtonProps } from '@/types';

export function ApprovalButton({ applicationId }: ApprovalButtonProps) {
	const [isApproved, setIsApproved] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const fetchApprovalStatus = async () => {
			try {
				const response = await fetch('/api/applications/approvals');
				if (response.ok) {
					const approvals = await response.json();
					const isCurrentAppApproved = approvals.some(
						(approval: { applicationId: string }) => approval.applicationId === applicationId,
					);
					setIsApproved(isCurrentAppApproved);
				}
			} catch (error) {
				console.error('Error fetching approval status:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchApprovalStatus();
	}, [applicationId]);

	const handleToggleApproval = async () => {
		if (isApproved) return;

		setIsLoading(true);
		try {
			const response = await fetch(`/api/applications/${applicationId}/approval`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ approve: true }),
			});

			if (response.ok) {
				setIsApproved(true);
				toast.success('Application approved');
				router.refresh();
			} else if (response.status === 403) {
				toast.error('You do not have permission to approve applications');
			} else {
				throw new Error('Failed to update approval status');
			}
		} catch (error) {
			console.error('Error updating approval:', error);
			toast.error('Failed to update approval status');
		} finally {
			setIsLoading(false);
		}
	};

	const iconClasses = `inline-flex items-center justify-center ${isApproved ? 'text-green-600' : 'text-gray-400'}`;

	return (
		<button
			onClick={handleToggleApproval}
			className={`${iconClasses} ${!isApproved && 'hover:text-gray-600'}`}
			disabled={isLoading || isApproved}
			aria-label={isApproved ? 'Application is approved' : 'Approve application'}
			title={isApproved ? 'Application is approved' : 'Approve application'}
		>
			<Icon
				icon="lucide:check"
				width="24"
				height="24"
			/>
		</button>
	);
}
