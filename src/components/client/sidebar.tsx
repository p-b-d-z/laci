'use client';

import { Icon } from '@iconify/react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TwentyFortyEight } from '@/components/client/twenty-forty-eight';

const handleSignOut = () => {
	signOut({ callbackUrl: '/' });
};

const baseItems = [
	{ icon: 'lucide:search', label: 'Applications', href: '/dashboard/applications' },
	{ icon: 'lucide:user', label: 'My Responsibilities', href: '/dashboard/my-responsibilities' },
	{ icon: 'lucide:info', label: 'Help', href: '/help' },
];

const adminItems = [
	{ icon: 'lucide:users', label: 'Approvers', href: '/approvers' },
	{ icon: 'lucide:scroll-text', label: 'Logs', href: '/dashboard/audit' },
	{ icon: 'lucide:layout-dashboard', label: 'Settings', href: '/dashboard/manage' },
];

export function Sidebar() {
	const pathname = usePathname();
	const [sidebarItems, setSidebarItems] = useState(baseItems);
	const [showGame, setShowGame] = useState(false);

	useEffect(() => {
		async function checkAdminStatus() {
			try {
				const response = await fetch('/api/auth/admin');
				const { isAdmin } = await response.json();
				setSidebarItems(isAdmin ? [...baseItems, ...adminItems] : baseItems);
			} catch (error) {
				console.error('Failed to check admin status:', error);
				setSidebarItems(baseItems);
			}
		}

		checkAdminStatus();
	}, []);

	return (
		<>
			<aside className="w-16 lg:w-56 bg-gray-100 dark:bg-gray-800 h-screen fixed left-0 top-0 p-2 lg:p-4 flex flex-col overflow-y-auto transition-all duration-300">
				<div className="mb-4 lg:mb-8">
					<h1
						className="text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400 text-center lg:text-left"
						onClick={() => setShowGame((prev) => !prev)}
					>
						LACI
					</h1>
					<p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 hidden lg:block">Service Responsibilities</p>
				</div>
				<nav className="flex-grow">
					<ul className="space-y-2">
						{sidebarItems.map((item) => (
							<li key={item.href}>
								<Link
									href={item.href}
									className={`flex items-center justify-center lg:justify-start space-x-2 p-2 rounded-lg transition-colors ${
										pathname === item.href ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
									}`}
								>
									<Icon
										icon={item.icon}
										className="w-5 h-5"
									/>
									<span className="hidden lg:inline">{item.label}</span>
								</Link>
							</li>
						))}
					</ul>
				</nav>
				<button
					onClick={handleSignOut}
					className="flex items-center justify-center lg:justify-start space-x-2 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-full mt-auto"
				>
					<Icon
						icon="lucide:log-out"
						className="w-5 h-5"
					/>
					<span className="hidden lg:inline">Sign Out</span>
				</button>
			</aside>

			{showGame && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 p-4 rounded-lg relative">
						<TwentyFortyEight onExit={() => setShowGame(false)} />
					</div>
				</div>
			)}
		</>
	);
}
