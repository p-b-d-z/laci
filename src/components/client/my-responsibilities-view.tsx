'use client';

import { useSearchParams } from 'next/navigation';
import { MyResponsibilitiesTable } from '@/components/client/my-responsibilities-table';
import { MyResponsibilitiesMatrix } from '@/components/client/my-responsibilities-matrix';
import { MyResponsibilitiesProps } from '@/types';

export function MyResponsibilitiesView({ userEmail, userName, showDisabled }: MyResponsibilitiesProps) {
	const searchParams = useSearchParams();
	const view = searchParams.get('view') ?? 'table';

	// Parse filter params from URL
	const selectedCategories = searchParams.get('categories')?.split(',').filter(Boolean) ?? [];
	const selectedFields = searchParams.get('fields')?.split(',').filter(Boolean) ?? [];

	const sharedProps = {
		userEmail,
		userName,
		showDisabled,
		selectedCategories,
		selectedFields,
	};

	return (
		<div className="pt-6 space-y-4">
			{view === 'table' ? <MyResponsibilitiesTable {...sharedProps} /> : <MyResponsibilitiesMatrix {...sharedProps} />}
		</div>
	);
}
