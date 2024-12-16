'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { RefreshButtonProps } from '@/types';
import { toast } from 'react-hot-toast';

export function RefreshButton({ cacheKeys, onRefresh, refreshTrigger }: RefreshButtonProps & { refreshTrigger?: number }) {
	const [isRefreshing, setIsRefreshing] = useState(false);
	const router = useRouter();

	const handleRefresh = async () => {
		setIsRefreshing(true);
		toast.loading('Refreshing data...', { id: 'refreshToast' });
		try {
			for (const key of cacheKeys) {
				await fetch(`/api/redis/clear?key=${encodeURIComponent(key)}`, {
					method: 'POST',
				});
			}
			if (onRefresh) {
				onRefresh();
			}
			router.refresh();
			setTimeout(() => {
				window.location.reload();
			}, 100);
			toast.success('Data refreshed successfully', { id: 'refreshToast' });
		} catch (error) {
			console.error('Error clearing cache:', error);
			toast.error('Error refreshing data!', { id: 'refreshToast' });
		} finally {
			setIsRefreshing(false);
		}
	};

	useEffect(() => {
		if (refreshTrigger) {
			handleRefresh();
		}
	}, [refreshTrigger]);

	return (
		<button
			onClick={handleRefresh}
			disabled={isRefreshing}
			className="text-blue-600 hover:text-blue-800"
			aria-label="Refresh"
			title={isRefreshing ? 'Refreshing data...' : 'Refresh data'}
		>
			<Icon
				icon="lucide:refresh-cw"
				width="24"
				height="24"
				className={isRefreshing ? 'animate-spin' : ''}
			/>
		</button>
	);
}
