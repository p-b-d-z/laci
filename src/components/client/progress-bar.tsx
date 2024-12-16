'use client';

import React from 'react';
import { ProgressBarProps } from '@/types';

export function ProgressBar({ processed, total }: ProgressBarProps) {
	const percentage = total > 0 ? (processed / total) * 100 : 0;
	const isIndeterminate = total === 0;

	return (
		<div className="w-full">
			<div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
				<div
					className={`h-full bg-blue-500 transition-all duration-300 ease-in-out ${isIndeterminate ? 'indeterminate' : ''}`}
					style={{
						width: isIndeterminate ? '30%' : `${percentage}%`,
						animation: isIndeterminate ? 'indeterminate 1.5s infinite linear' : 'none',
						backgroundImage:
							'linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent)',
						backgroundSize: '40px 40px',
					}}
				/>
			</div>
		</div>
	);
}
