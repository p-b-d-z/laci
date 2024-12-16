'use client';

import { signIn, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { UserDetailsProps } from '@/types';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import type { ClientSafeProvider } from 'next-auth/react';
import { PROVIDER_ICONS } from '@/constants';

type AuthLandingProps = {
	providers: Record<string, ClientSafeProvider>;
	initialUserData?: UserDetailsProps;
};

export default function AuthLanding({ providers }: AuthLandingProps) {
	const { data: session, status } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (session) {
			router.push('/dashboard/applications');
		}
	}, [session, router]);

	if (status === 'loading' || session) {
		return null;
	}

	if (!providers || Object.keys(providers).length === 0) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<button
					disabled
					className="bg-red-500 text-white px-6 py-3 rounded-lg cursor-not-allowed"
				>
					No Providers Configured
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-800 p-4">
			<div className="text-center mb-12">
				<h1 className="text-7xl font-bold text-blue-600 dark:text-blue-400 mb-4">LACI</h1>
				<p className="text-xl text-gray-600 dark:text-gray-400">Service Responsibilities</p>
			</div>

			<div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg w-full max-w-md">
				<h2 className="text-2xl font-semibold mb-6 text-center dark:text-gray-200">Sign In</h2>
				<div className="space-y-4">
					{Object.values(providers || {}).map((provider) => (
						<button
							key={provider.id}
							onClick={() => signIn(provider.id, { callbackUrl: '/dashboard/applications' })}
							className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg transition-colors"
						>
							<Icon
								icon={PROVIDER_ICONS[provider.id] || 'lucide:log-in'}
								className="w-5 h-5"
							/>
							<span>Continue with {provider.name}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
