import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID } from '@/constants';
import { Group as MicrosoftGroup } from '@microsoft/microsoft-graph-types';
import { AzureEntity } from '@/types';
import serverLogger from '@/lib/logging/server';

let graphClient: Client | null = null;

function initializeGraphClient() {
	if (graphClient) return graphClient;

	const credential = new ClientSecretCredential(AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET);

	const authProvider = new TokenCredentialAuthenticationProvider(credential, {
		scopes: ['https://graph.microsoft.com/.default'],
	});

	graphClient = Client.initWithMiddleware({
		authProvider,
		defaultVersion: 'v1.0',
		debugLogging: true,
	});
	return graphClient;
}

async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			serverLogger.error(`Attempt ${attempt} failed:`, error);
			if (attempt === maxRetries) throw error;
			await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
		}
	}
	throw new Error('This should never be reached');
}

function isValidUser(user: AzureEntity): boolean {
	/*
		Filter out users that are not valid
	*/
	if (!user.userPrincipalName || !user.mail) return false;
	if (user.userPrincipalName.startsWith('-')) return false;
	if (user.userPrincipalName.includes('#EXT#')) return false;
	if (user.displayName.toLowerCase().includes('test')) return false;
	if (user.userPrincipalName.includes('onmicrosoft.com')) return false;
	return !user.mail.includes('onmicrosoft.com');
}

function isValidGroup(group: AzureEntity): boolean {
	/*
		Filter out groups that are not valid
	*/
	if (group.mail) {
		if (group.mail.toLowerCase().includes('onmicrosoft.com')) return false;
	}

	if (group.proxyAddresses) {
		group.proxyAddresses = group.proxyAddresses
			.filter((address) => !address.toLowerCase().startsWith('spo:') && !address.toLowerCase().includes('onmicrosoft.com'))
			.map((address) => address.replace(/^(SMTP|smtp):/, ''));
	}
	return true;
}

export async function getUsers() {
	return retryOperation(async () => {
		const client = initializeGraphClient();
		let allUsers: AzureEntity[] = [];
		let nextLink: string | null = '/users?$select=id,displayName,userPrincipalName,mail&$top=999';

		while (nextLink) {
			const response = await client.api(nextLink).get();
			const validUsers = response.value.filter(isValidUser);
			allUsers = allUsers.concat(validUsers);
			nextLink = response['@odata.nextLink'] || null;
			//serverLogger.info(`All users: ${JSON.stringify(allUsers)}`);
		}

		return allUsers;
	});
}

export async function getGroups() {
	return retryOperation(async () => {
		const client = initializeGraphClient();
		let allGroups: AzureEntity[] = [];
		const uniqueGroupIds = new Set<string>();

		// Fetch mail-enabled groups
		let mailGroupsLink: string | null = '/groups?$select=id,displayName,mail,proxyAddresses&$top=999';
		while (mailGroupsLink) {
			const response = await client.api(mailGroupsLink).get();
			const validGroups = response.value.filter(isValidGroup);
			allGroups = allGroups.concat(validGroups);
			mailGroupsLink = response['@odata.nextLink'] || null;
		}

		// Fetch security groups
		let securityGroupsLink: string | null =
			'/groups?$select=id,displayName&$filter=mailEnabled eq false and securityEnabled eq true&$top=999';
		while (securityGroupsLink) {
			const response = await client.api(securityGroupsLink).get();
			const securityGroups = response.value.map((group: MicrosoftGroup) => ({
				...group,
				mail: 'undefined',
				proxyAddresses: [],
			}));
			const validGroups = securityGroups.filter(isValidGroup);
			allGroups = allGroups.concat(validGroups);
			securityGroupsLink = response['@odata.nextLink'] || null;
		}

		// Enforce uniqueness based on group.id
		allGroups = allGroups.filter((group) => {
			if (uniqueGroupIds.has(group.id)) {
				return false;
			}
			uniqueGroupIds.add(group.id);
			return true;
		});

		// Sort by displayName A->Z
		allGroups.sort((a, b) => a.displayName.localeCompare(b.displayName));

		return allGroups;
	});
}

export async function fetchAzureADGroups(accessToken: string): Promise<string[]> {
	const authProvider = new TokenCredentialAuthenticationProvider(
		{
			getToken: async () => ({ token: accessToken, expiresOnTimestamp: 0 }),
		},
		{
			scopes: ['https://graph.microsoft.com/.default'],
		},
	);

	const client = Client.initWithMiddleware({
		authProvider,
	});

	try {
		const response = await client.api('/me/memberOf').get();
		return response.value.map((group: MicrosoftGroup) => group.displayName);
	} catch (error) {
		serverLogger.error('Error fetching Azure AD groups:', error);
		return [];
	}
}
