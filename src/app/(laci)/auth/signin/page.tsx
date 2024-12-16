import { getServerSession } from 'next-auth/next';
import { getProviders } from 'next-auth/react';
import { redirect } from 'next/navigation';
import AuthLanding from '@/components/client/auth-landing';
import { authOptions } from '@/lib/auth/providers';
import '@/styles/globals.css';

export default async function SignIn() {
	const session = await getServerSession(authOptions);
	const providers = (await getProviders()) ?? {};

	if (session) {
		redirect('/dashboard/applications');
	}

	return <AuthLanding providers={providers} />;
}
