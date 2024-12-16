'use client';

import React from 'react';
import { ManageApplications } from '@/components/client/manage-applications';
import { ManageCategories } from '@/components/client/manage-categories';
import { ManageFields } from '@/components/client/manage-fields';
import { AssignedUserSwap } from '@/components/client/assigned-user-swap';

export default function ManageSettings() {
	return (
		<div className="flex justify-center items-center min-h-screen">
			<div className="space-y-6 w-full lg:w-3/4">
				<div className="flex flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
					<div className="w-full lg:w-1/2">
						<ManageApplications />
					</div>
					<div className="w-full lg:w-1/2">
						<AssignedUserSwap />
					</div>
				</div>

				<div className="flex flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
					<div className="w-full lg:w-1/2">
						<ManageFields />
					</div>
					<div className="w-full lg:w-1/2">
						<ManageCategories />
					</div>
				</div>

				{/* padding div */}
				<div className="h-[200px]"></div>
			</div>
		</div>
	);
}
