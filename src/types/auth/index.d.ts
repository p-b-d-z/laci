import { Session } from 'next-auth';

export type AzureEntity = {
	id: string;
	displayName: string;
	userPrincipalName?: string;
	mail?: string | null | undefined;
	proxyAddresses?: string[];
};

export type SearchResult = {
	displayName: string;
	mail: string | null;
};

/* Authentication */
export type AuthSource = 'Okta' | 'Azure';

export type AuthConfig = {
	isOktaConfigured: boolean;
	isAzureConfigured: boolean;
};

export type CustomSession = Session & {
	accessToken?: string;
	idToken?: string;
	provider?: string;
	user: {
		groups?: string[];
		name?: string | null;
		preferred_name?: string | null;
		email?: string | null;
		image?: string | null;
		upn?: string;
		preferredUsername?: string | null;
	} & Session['user'];
};

export type AuthContextType = {
	isAuthenticated: boolean;
	isLoading: boolean;
	session: CustomSession | null;
	user: CustomSession['user'] | null;
	groups: string[];
	provider: string | null;
};

export type UserData = {
	name: string;
	email: string;
	groups?: string[];
};

export type UserDetailsProps = {
	initialUserData: UserData | null;
};
