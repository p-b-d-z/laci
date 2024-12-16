'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/authentication';
import { useSession } from 'next-auth/react';
import { ClientSafeProvider } from 'next-auth/react';
import { CustomSession } from '@/types';
import AuthLanding from '@/components/client/auth-landing';
/* Auth wrapper */
import { SessionProvider } from 'next-auth/react';
/* Cookies wrapper */
import { CookiesProvider } from '@/contexts/cookies';
import { MmmmCookie } from '@/types';

type AuthWrapperProps = {
	cookies: MmmmCookie;
	providers: Record<string, ClientSafeProvider>;
	children: React.ReactNode;
};

function AuthStateProvider({ cookies, children }: { cookies: MmmmCookie; children: React.ReactNode }) {
	const { data: session, status } = useSession();
	const customSession = session as CustomSession;

	const contextValue = {
		isAuthenticated: status === 'authenticated',
		isLoading: status === 'loading',
		session: customSession,
		user: customSession?.user || null,
		groups: customSession?.user?.groups || [],
		provider: customSession?.provider || null,
	};

	return (
		<CookiesProvider cookies={cookies}>
			<AuthProvider initialState={contextValue}>{children}</AuthProvider>
		</CookiesProvider>
	);
}

export function AuthProviderWrapper({ cookies, providers, children }: AuthWrapperProps) {
	return (
		<SessionProvider>
			<AuthStateProvider cookies={cookies}>
				<AuthLanding providers={providers} />
				{children}
			</AuthStateProvider>
		</SessionProvider>
	);
}
