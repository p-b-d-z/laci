import { getServerSession } from 'next-auth/next';
import { getProviders } from 'next-auth/react';
import { cookies } from 'next/headers';
import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from '@/components/client/sidebar';
import { AuthProviderWrapper } from '@/components/client/auth-wrapper';
import { authOptions } from '@/lib/auth/providers';
import '@/styles/globals.css';

function getInitialCookieData() {
	const cookieStore = cookies();
	const theme = cookieStore.get('theme')?.value || 'dark';

	return {
		theme: theme,
	};
}

export const metadata = {
	title: 'LACI',
	description: 'Service Roles and Responsibilities',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerSession(authOptions);
	const providers = (await getProviders()) || {};
	const cookieStore = getInitialCookieData();

	return (
		<html lang="en">
			<body className="overflow-hidden">
				<AuthProviderWrapper
					cookies={cookieStore}
					providers={providers}
				>
					<div className="flex h-screen">
						{session && <Sidebar />}
						<main className={`flex-1 overflow-auto ${session ? 'ml-16 lg:ml-56' : ''}`}>{children}</main>
					</div>
				</AuthProviderWrapper>
				<Toaster position="bottom-right" />
			</body>
		</html>
	);
}
