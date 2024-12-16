import { useState, useEffect } from 'react';
import { AzureEntity } from '@/types';

export function useAzureEntities() {
	const [azureEntities, setAzureEntities] = useState<AzureEntity[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchAzureEntities() {
			try {
				const [usersResponse, groupsResponse] = await Promise.all([fetch('/api/azure/users'), fetch('/api/azure/groups')]);

				const users: AzureEntity[] = await usersResponse.json();
				const groups: AzureEntity[] = await groupsResponse.json();

				setAzureEntities([...users, ...groups]);
				setIsLoading(false);
			} catch (error) {
				console.error('Error fetching Azure entities:', error);
				setError('Failed to fetch Azure entities');
				setIsLoading(false);
			}
		}

		fetchAzureEntities();
	}, []);

	return { azureEntities, isLoading, error };
}
