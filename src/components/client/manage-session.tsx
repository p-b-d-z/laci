'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { CustomSession } from '@/types';
import Image from 'next/image';
import { Icon } from '@iconify/react';

export function SessionInfo() {
	const { data: session, status } = useSession();
	const customSession = session as CustomSession;
	const [showGroups, setShowGroups] = useState(false);
	const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
	const [isApprover, setIsApprover] = useState<boolean | null>(null);

	useEffect(() => {
		const checkPermissions = async () => {
			const [adminResponse, approverResponse] = await Promise.all([fetch('/api/auth/admin'), fetch('/api/auth/approver')]);
			const { isAdmin } = await adminResponse.json();
			const { isApprover } = await approverResponse.json();
			setIsAdmin(isAdmin);
			setIsApprover(isApprover);
		};

		if (customSession) {
			checkPermissions();
		}
	}, [customSession]);

	if (status === 'loading') {
		return <div className="w-full bg-gray-100 p-4 rounded-lg">Loading session...</div>;
	}

	if (!customSession) {
		return <div className="w-full bg-gray-100 p-4 rounded-lg">Not authenticated</div>;
	}

	return (
		<div className="w-full bg-gray-100 p-4 rounded-lg">
			<div className="flex flex-col space-y-3">
				<div className="flex items-center space-x-4">
					{customSession.user?.image && (
						<Image
							src={customSession.user.image}
							alt="Profile"
							width={48}
							height={48}
							className="rounded-full"
							priority
						/>
					)}
					<div className="flex-1 flex items-center justify-between">
						<div className="flex flex-col">
							<h3 className="text-xl font-semibold">{customSession.user?.name}</h3>
							<span className="text-sm text-gray-500">{customSession.user?.email}</span>
						</div>
						<div className="flex items-center gap-6">
							<div className="flex items-center gap-2">
								<span className="font-medium">Admin</span>
								{isAdmin === null ? (
									'...'
								) : isAdmin ? (
									<Icon
										icon="lucide:badge-check"
										className="w-5 h-5 text-green-500"
									/>
								) : (
									<Icon
										icon="lucide:badge"
										className="w-5 h-5 text-red-500"
									/>
								)}
							</div>
							<div className="flex items-center gap-2">
								<span className="font-medium">Approver</span>
								{isApprover === null ? (
									'...'
								) : isApprover ? (
									<Icon
										icon="lucide:badge-check"
										className="w-5 h-5 text-green-500"
									/>
								) : (
									<Icon
										icon="lucide:badge"
										className="w-5 h-5 text-red-500"
									/>
								)}
							</div>
							<button
								onClick={() => setShowGroups(!showGroups)}
								className="flex items-center gap-1 text-blue-500 hover:underline focus:outline-none"
							>
								<span>{showGroups ? 'Hide' : 'Show'} Groups</span>
								<Icon
									icon={showGroups ? 'lucide:chevron-up' : 'lucide:chevron-down'}
									className="w-4 h-4"
								/>
							</button>
						</div>
					</div>
				</div>

				{showGroups && (
					<div className="flex flex-wrap gap-2 pl-16">
						{customSession.user?.groups?.length ? (
							customSession.user.groups.map((group, index) => (
								<span
									key={index}
									className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
								>
									{group}
								</span>
							))
						) : (
							<span className="text-gray-500 italic">No groups assigned</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
