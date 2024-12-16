import Link from 'next/link';
import { Application, ApprovalStatus } from '@/types';
import { Icon } from '@iconify/react';
import React, { useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { formatNameForUrl } from '@/lib/formatting';

function formatDate(dateString: string) {
	const date = new Date(dateString);
	const dateComponent = date.toLocaleDateString();
	const timeComponent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	return { dateComponent, timeComponent };
}

function getPopularityIcon(hitCount: number, maxHitCount: number) {
	const percentage = (hitCount / maxHitCount) * 100;
	if (percentage === 0) return 'lucide:wifi-zero';
	if (percentage <= 25) return 'lucide:wifi-low';
	if (percentage <= 75) return 'lucide:wifi-high';
	return 'lucide:wifi';
}

type RowProps = {
	index: number;
	style: React.CSSProperties;
	data: {
		applications: Application[];
		maxHitCount: number;
		approvalStatuses: Record<string, ApprovalStatus>;
	};
};

function Row({ index, style, data }: RowProps) {
	const { applications, maxHitCount, approvalStatuses } = data;
	const app = applications[index];
	const { dateComponent, timeComponent } = formatDate(app.updatedAt);

	return (
		<div
			style={style}
			className="flex w-full"
		>
			<div className="flex-[2] lg:flex-[4] min-w-0 px-6 py-2">
				<Link
					href={`/dashboard/application/${formatNameForUrl(app.name)}`}
					className="text-blue-600 hover:underline truncate block"
				>
					<span className="text-base font-medium">{app.name}</span>
				</Link>
			</div>
			<div className="hidden lg:flex flex-[2] min-w-0 px-2 py-2 justify-center items-center">
				<Icon
					icon={getPopularityIcon(app.hitCount, maxHitCount)}
					width="24"
					height="24"
				/>
			</div>
			<div className="flex-[1] lg:flex-[2] min-w-0 px-2 py-2 flex justify-center items-center">
				{approvalStatuses[app.id]?.approved ? (
					<div title={`Approved on ${dateComponent}`}>
						<Icon
							icon="mdi:check-circle"
							className="text-green-500"
							width="24"
							height="24"
						/>
					</div>
				) : (
					<div title="Pending Approval">
						<Icon
							icon="lucide:ellipsis"
							className="text-gray-400"
							width="24"
							height="24"
						/>
					</div>
				)}
			</div>
			<div className="flex-[1] lg:flex-[2] min-w-0 px-6 py-1 text-right">
				<div className="text-sm text-gray-500">{dateComponent}</div>
				<div className="text-xs text-gray-400">{timeComponent}</div>
			</div>
		</div>
	);
}

export function ApplicationList({ applications, maxHitCount }: { applications: Application[]; maxHitCount: number }) {
	const [approvalStatuses, setApprovalStatuses] = useState<Record<string, ApprovalStatus>>({});

	useEffect(() => {
		const fetchApprovalStatuses = async () => {
			try {
				const response = await fetch('/api/applications/approvals');
				if (response.ok) {
					const approvals = await response.json();
					const statuses: Record<string, ApprovalStatus> = {};
					approvals.forEach((approval: { applicationId: string; approvedAt: string; approverId: string }) => {
						statuses[approval.applicationId] = {
							approved: true,
							approvedAt: approval.approvedAt,
							approverId: approval.approverId,
						};
					});
					setApprovalStatuses(statuses);
				}
			} catch (error) {
				console.error('Failed to fetch approval statuses:', error);
			}
		};

		fetchApprovalStatuses();
	}, []);

	return (
		<div className="h-[600px] w-full">
			<div className="flex w-full bg-gray-100">
				<div className="flex-[2] lg:flex-[4] min-w-0 px-6 py-2">
					<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</span>
				</div>
				<div className="hidden lg:flex flex-[2] min-w-0 px-2 py-2 justify-center">
					<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Popularity</span>
				</div>
				<div className="flex-[1] lg:flex-[2] min-w-0 px-2 py-2 text-center">
					<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</span>
				</div>
				<div className="flex-[1] lg:flex-[2] min-w-0 px-6 py-2 text-right">
					<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</span>
				</div>
			</div>
			<AutoSizer>
				{({ height, width }) => (
					<List
						height={height}
						itemCount={applications.length}
						itemSize={50}
						width={width}
						itemData={{
							applications,
							maxHitCount,
							approvalStatuses,
						}}
					>
						{Row}
					</List>
				)}
			</AutoSizer>
		</div>
	);
}
