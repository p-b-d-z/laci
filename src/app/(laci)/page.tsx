import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import AuthLanding from '@/components/client/auth-landing';
import { AuthProviderWrapper } from '@/components/client/auth-wrapper';
import { cookies } from 'next/headers';

function getInitialCookieData() {
	const cookieStore = cookies();
	const theme = cookieStore.get('theme')?.value || 'dark';

	return {
		theme: theme,
	};
}

export default async function Home() {
	const session = await getServerSession(authOptions);
	const cookieStore = getInitialCookieData();
	const providersResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/providers`);
	const providers = await providersResponse.json();
	let userData = null;

	if (!providers) {
		throw new Error('No authentication providers available. Check server configuration.');
	}

	if (session) {
		const res = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/whoami`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		if (res.ok) {
			const data = await res.json();
			userData = data.user;
		}
	}

	return (
		<AuthProviderWrapper
			cookies={cookieStore}
			providers={providers}
		>
			<AuthLanding
				initialUserData={userData}
				providers={providers}
			/>
		</AuthProviderWrapper>
	);
}
