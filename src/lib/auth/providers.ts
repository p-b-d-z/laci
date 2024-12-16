import { NextAuthOptions, Profile } from 'next-auth';
import OktaProvider from 'next-auth/providers/okta';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { fetchAzureADGroups } from '@/lib/auth/azure-auth';
import { createUser, getUserByEmail, getUserById, insertAuditLog, updateUserLastLogon } from '@/lib/mysql/queries';
import {
	AZURE_AD_CLIENT_ID,
	AZURE_AD_CLIENT_SECRET,
	AZURE_AD_TENANT_ID,
	OKTA_CLIENT_ID,
	OKTA_CLIENT_SECRET,
	OKTA_DOMAIN,
	isOktaConfigured,
	isAzureConfigured,
} from '@/constants';
import { CreateUserInput, CustomSession } from '@/types';

export const authOptions: NextAuthOptions = {
	providers: [
		...(isOktaConfigured
			? [
					OktaProvider({
						clientId: OKTA_CLIENT_ID,
						clientSecret: OKTA_CLIENT_SECRET,
						issuer: OKTA_DOMAIN,
						authorization: {
							params: {
								scope: 'openid email profile groups offline_access',
								response_type: 'code',
								redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/okta`,
							},
						},
					}),
				]
			: []),
		...(isAzureConfigured
			? [
					AzureADProvider({
						clientId: AZURE_AD_CLIENT_ID,
						clientSecret: AZURE_AD_CLIENT_SECRET,
						tenantId: AZURE_AD_TENANT_ID,
						authorization: {
							params: {
								scope: 'openid email profile User.Read',
								redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`,
							},
						},
					}),
				]
			: []),
	],
	pages: {
		signIn: '/auth/signin',
		error: '/auth/error',
	},
	callbacks: {
		async jwt({ token, account, profile }) {
			if (account && profile) {
				token.accessToken = account.access_token;
				token.idToken = account.id_token;
				token.provider = account.provider;

				if (account.provider === 'okta') {
					const oktaProfile = profile as Profile & { groups?: string[] };
					token.groups = oktaProfile.groups || [];
					// console.log('Okta groups:', token.groups);
				} else if (account.provider === 'azure-ad') {
					token.groups = (await fetchAzureADGroups(token.accessToken as string)) || [];
				} else {
					token.groups = [];
				}

				token.preferredUsername = (profile as Profile & { preferred_username?: string }).preferred_username;
				token.upn = (profile as Profile & { upn?: string }).upn;
				// console.log('Profile object:', profile);
				// console.log('Token object:', token);
			}
			return token;
		},
		async session({ session, token }) {
			const customSession = session as CustomSession;
			// console.log('session:', customSession)
			customSession.accessToken = token.accessToken as string;
			customSession.idToken = token.idToken as string;
			customSession.user.groups = token.groups as string[];
			customSession.provider = token.provider as string;
			customSession.user.upn = token.upn as string;
			customSession.user.preferredUsername = token.preferredUsername as string;

			return customSession;
		},
		async signIn({ user }) {
			if (user && user.email) {
				let dbUser = await getUserByEmail(user.email);

				if (!dbUser) {
					const newUser: CreateUserInput = {
						name: user.name || 'Unknown',
						email: user.email,
					};
					const userId = await createUser(newUser);
					dbUser = await getUserById(userId);

					if (!dbUser) {
						return false;
					}
				}

				await updateUserLastLogon(dbUser.id);

				await insertAuditLog({
					actor: dbUser.id,
					action: 'login',
					target: 'system',
					targetId: dbUser.id,
					changes: {
						user: user.email,
						loggedIn: true,
					},
				});
				return true;
			}
			return false;
		},
	},
	events: {
		async signOut({ token }) {
			if (token && token.email) {
				const dbUser = await getUserByEmail(token.email as string);
				if (dbUser) {
					await insertAuditLog({
						actor: dbUser.id,
						action: 'logout',
						target: 'system',
						targetId: dbUser.id,
						changes: {
							user: token.email,
							loggedIn: false,
						},
					});
				}
			}
		},
	},
	secret: process.env.NEXTAUTH_SECRET,
};
