'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

type ErrorProps = {
	title: string;
	description: string;
	details?: string;
};

export function Error({ title, description, details }: ErrorProps) {
	const router = useRouter();

	return (
		<div className="-m-6 h-screen flex items-center justify-center">
			<div className="bg-white rounded-lg shadow-lg w-1/3">
				<div className="bg-red-50 p-4 border-b border-red-100">
					<h2 className="text-lg font-bold text-red-800">{title}</h2>
				</div>

				<div className="p-6">
					<p className="text-gray-700 whitespace-pre-wrap">{description}</p>

					{details && (
						<div className="mt-4">
							<pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm font-mono border border-gray-200">
								{details}
							</pre>
						</div>
					)}

					<button
						onClick={() => router.back()}
						className="mt-6 flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
					>
						<Icon
							icon="lucide:arrow-left"
							width="16"
						/>
						Go Back
					</button>
				</div>
			</div>
		</div>
	);
}
