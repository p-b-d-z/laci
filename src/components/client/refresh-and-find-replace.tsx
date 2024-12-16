'use client';

import React, { useState } from 'react';
import { RefreshButton } from '@/components/client/refresh-button';
import FindReplaceModal from '@/components/client/modal-find-replace';
import { Icon } from '@iconify/react';

interface RefreshAndFindReplaceProps {
	applicationId: string;
	cacheKeys: string[];
}

export function RefreshAndFindReplace({ applicationId, cacheKeys }: RefreshAndFindReplaceProps) {
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	const handleFindReplaceSuccess = () => {
		setRefreshTrigger((prev) => prev + 1);
	};

	return (
		<div className="flex space-x-2">
			<RefreshButton
				cacheKeys={cacheKeys}
				refreshTrigger={refreshTrigger}
			/>
			<FindReplaceModal
				applicationId={applicationId}
				onSuccess={handleFindReplaceSuccess}
			>
				<Icon
					icon="lucide:repeat"
					className="w-5 h-5 text-black"
				/>
			</FindReplaceModal>
		</div>
	);
}
