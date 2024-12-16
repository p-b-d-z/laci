'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuditLog } from '@/types';
import { RefreshButton } from '@/components/client/refresh-button';
import { AUDIT_LOGS_CACHE_KEY } from '@/constants';
import { formatChanges, formatDate } from '@/lib/formatting';

const PAGE_SIZE = 15;

type AuditLogClientProps = {
	initialLogs: AuditLog[];
	initialDays: number;
};

export function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

export default function AuditLogClient({ initialLogs, initialDays }: AuditLogClientProps) {
	const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterAction, setFilterAction] = useState('');
	const [filterTarget, setFilterTarget] = useState('');
	const [filterDays, setFilterDays] = useState(initialDays);
	const searchParams = useSearchParams();
	const router = useRouter();
	const [currentPage, setCurrentPage] = useState(1);

	const debouncedSearchTerm = useDebounce(searchTerm, 300);
	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};
	useEffect(() => {
		setSearchTerm(searchParams.get('search') || '');
		setFilterAction(searchParams.get('action') || '');
		setFilterTarget(searchParams.get('target') || '');
		setFilterDays(parseInt(searchParams.get('days') || initialDays.toString(), 10));
	}, [searchParams, initialDays]);

	useEffect(() => {
		const fetchLogs = async () => {
			const response = await fetch(`/api/audit?days=${filterDays}`);
			if (response.ok) {
				const newLogs: AuditLog[] = await response.json();
				setLogs(newLogs);
			}
		};
		fetchLogs();
	}, [filterDays]);

	const filteredLogs = useMemo(
		() =>
			logs.filter((log) => {
				const searchMatch =
					log.actor_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
					log.target_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
				const actionMatch = filterAction ? log.action === filterAction : true;
				const targetMatch = filterTarget ? log.target === filterTarget : true;
				return searchMatch && actionMatch && targetMatch;
			}),
		[logs, debouncedSearchTerm, filterAction, filterTarget],
	);

	const totalPages = useMemo(() => Math.ceil(filteredLogs.length / PAGE_SIZE), [filteredLogs]);

	const paginatedLogs = useMemo(
		() => filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
		[filteredLogs, currentPage],
	);

	const renderPageNumbers = () => {
		const pageNumbers = [];
		const maxPagesToShow = 5;
		const halfWindow = Math.floor(maxPagesToShow / 2);
		let startPage = Math.max(currentPage - halfWindow, 1);
		const endPage = Math.min(startPage + maxPagesToShow - 1, totalPages);

		if (endPage - startPage < maxPagesToShow - 1) {
			startPage = Math.max(endPage - maxPagesToShow + 1, 1);
		}

		for (let i = startPage; i <= endPage; i++) {
			pageNumbers.push(
				<button
					key={i}
					onClick={() => handlePageChange(i)}
					className={`p-2 border rounded mx-1 ${currentPage === i ? 'bg-gray-300' : ''}`}
				>
					{i}
				</button>,
			);
		}

		return pageNumbers;
	};
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedSearchTerm]);

	return (
		<div>
			<div className="mb-4 flex justify-between items-center">
				{/* Search bar */}
				<div className="flex gap-4 items-center">
					<input
						type="text"
						placeholder="Search logs..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="p-2 border rounded"
					/>
					<select
						value={filterAction}
						onChange={(e) => setFilterAction(e.target.value)}
						className="p-2 border rounded"
					>
						<option value="">All Actions</option>
						<option value="add">Add</option>
						<option value="change">Change</option>
						<option value="delete">Delete</option>
						<option value="login">Login</option>
						<option value="logout">Logout</option>
					</select>
					<select
						value={filterTarget}
						onChange={(e) => setFilterTarget(e.target.value)}
						className="p-2 border rounded"
					>
						<option value="">All Targets</option>
						<option value="application">Application</option>
						<option value="category">Category</option>
						<option value="field">Field</option>
						<option value="entry">Entry</option>
						<option value="system">System</option>
					</select>
					<select
						value={filterDays}
						onChange={(e) => {
							const newDays = parseInt(e.target.value, 10);
							setFilterDays(newDays);
							router.push(`/dashboard/audit?days=${newDays}`);
						}}
						className="p-2 border rounded"
					>
						<option value="30">Last 30 days</option>
						<option value="60">Last 60 days</option>
						<option value="90">Last 90 days</option>
						<option value="365">Last 365 days</option>
					</select>
				</div>
				<RefreshButton
					cacheKeys={[AUDIT_LOGS_CACHE_KEY]}
					onRefresh={() => {
						setLogs([]);
					}}
				/>
			</div>
			{/* Top Pagination bar */}
			<div className="flex justify-end items-center mt-4 text-xs">
				<button
					onClick={() => handlePageChange(1)}
					disabled={currentPage === 1}
					className="p-2 border rounded mx-1"
				>
					{'<<'}
				</button>
				<button
					onClick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className="p-2 border rounded mx-1"
				>
					{'<'}
				</button>
				{renderPageNumbers()}
				<button
					onClick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					className="p-2 border rounded mx-1"
				>
					{'>'}
				</button>
				<button
					onClick={() => handlePageChange(totalPages)}
					disabled={currentPage === totalPages}
					className="p-2 border rounded mx-1"
				>
					{'>>'}
				</button>
			</div>
			{/* Log Table */}
			<div className="text-sm mt-4">
				<table className="w-full border-collapse border">
					<thead>
						<tr className="bg-gray-100">
							<th className="p-2 border">Timestamp</th>
							<th className="p-2 border">User</th>
							<th className="p-2 border">Action</th>
							<th className="p-2 border">Type</th>
							<th className="p-2 border">Target</th>
							<th className="p-2 border">Changes</th>
						</tr>
					</thead>
					<tbody>
						{paginatedLogs.map((log) => (
							<tr key={log.id}>
								<td className="p-2 border">{formatDate(log.timestamp)}</td>
								<td className="p-2 border">{log.actor && log.actor_name ? log.actor_name : log.actor}</td>
								<td className="p-2 border">{log.action}</td>
								<td className="p-2 border">{log.target}</td>
								<td className="p-2 border">{log.target_name || log.targetId || ''}</td>
								<td className="p-2 border">
									<pre className="whitespace-pre-wrap text-xs">
										<code>
											{log.target_name && `id: ${log.targetId}\n`}
											{formatChanges(log.changes)}
										</code>
									</pre>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{/* Bottom Pagination bar */}
			<div className="flex justify-end items-center mt-4 text-xs">
				<button
					onClick={() => handlePageChange(1)}
					disabled={currentPage === 1}
					className="p-2 border rounded mx-1"
				>
					{'<<'}
				</button>
				<button
					onClick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className="p-2 border rounded mx-1"
				>
					{'<'}
				</button>
				{renderPageNumbers()}
				<button
					onClick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					className="p-2 border rounded mx-1"
				>
					{'>'}
				</button>
				<button
					onClick={() => handlePageChange(totalPages)}
					disabled={currentPage === totalPages}
					className="p-2 border rounded mx-1"
				>
					{'>>'}
				</button>
			</div>
		</div>
	);
}
