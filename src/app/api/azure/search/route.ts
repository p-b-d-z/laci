import { NextResponse } from 'next/server';
import { AzureEntity } from '@/types';
import serverLogger from '@/lib/logging/server';
import { getGroups, getUsers } from '@/lib/auth/azure-auth';
import { getFromRedisOrFetch, setCache, getTTL } from '@/lib/redis/functions';
import { AZURE_GROUPS_CACHE_KEY, AZURE_USERS_CACHE_KEY, ONE_WEEK_TTL } from '@/constants';
import { SearchResult } from '@/types';

const REFRESH_THRESHOLD = 15 * 60;

async function fetchUsers(forceUpdate = false): Promise<AzureEntity[]> {
	if (forceUpdate) {
		const users = await getUsers();
		await setCache(AZURE_USERS_CACHE_KEY, users, ONE_WEEK_TTL);
		return users;
	}

	const users = await getFromRedisOrFetch<AzureEntity[]>(AZURE_USERS_CACHE_KEY, () => getUsers(), ONE_WEEK_TTL);

	const ttl = await getTTL(AZURE_USERS_CACHE_KEY);
	if (ttl && ttl < REFRESH_THRESHOLD) {
		serverLogger.info(`Users cache TTL (${ttl}s) below threshold, refreshing in background`);
		refreshUsersInBackground();
	}

	return users;
}

async function fetchGroups(forceUpdate = false): Promise<AzureEntity[]> {
	if (forceUpdate) {
		const groups = await getGroups();
		await setCache(AZURE_GROUPS_CACHE_KEY, groups, ONE_WEEK_TTL);
		return groups;
	}

	const groups = await getFromRedisOrFetch<AzureEntity[]>(AZURE_GROUPS_CACHE_KEY, () => getGroups(), ONE_WEEK_TTL);

	const ttl = await getTTL(AZURE_GROUPS_CACHE_KEY);
	if (ttl && ttl < REFRESH_THRESHOLD) {
		serverLogger.info(`Groups cache TTL (${ttl}s) below threshold, refreshing in background`);
		refreshGroupsInBackground();
	}

	return groups;
}

async function refreshUsersInBackground() {
	try {
		const freshUsers = await getUsers();
		await setCache(AZURE_USERS_CACHE_KEY, freshUsers, ONE_WEEK_TTL);
		serverLogger.info('Background users cache refresh completed');
	} catch (error) {
		serverLogger.error('Background users cache refresh failed:', error);
	}
}

async function refreshGroupsInBackground() {
	try {
		const freshGroups = await getGroups();
		await setCache(AZURE_GROUPS_CACHE_KEY, freshGroups, ONE_WEEK_TTL);
		serverLogger.info('Background groups cache refresh completed');
	} catch (error) {
		serverLogger.error('Background groups cache refresh failed:', error);
	}
}

function parseSearchTerms(query: string): string[] {
	const terms: string[] = [];
	let currentTerm = '';
	let inQuotes = false;

	for (let i = 0; i < query.length; i++) {
		if (query[i] === '"') {
			inQuotes = !inQuotes;
		} else if (query[i] === ' ' && !inQuotes) {
			if (currentTerm) terms.push(currentTerm);
			currentTerm = '';
		} else {
			currentTerm += query[i];
		}
	}
	if (currentTerm) terms.push(currentTerm);

	return terms.filter((term) => term.length > 0);
}

function matchesEntity(entity: AzureEntity, searchTerms: string[]): boolean {
	if (!searchTerms.length) return true;

	return searchTerms.every((term) => {
		const termLower = term.toLowerCase();
		const displayNameMatch = entity.displayName?.toLowerCase().includes(termLower);
		const mailMatch = entity.mail?.toLowerCase().includes(termLower);
		const upnMatch = entity.userPrincipalName?.toLowerCase().includes(termLower);
		const proxyMatch = entity.proxyAddresses?.some((proxy) => proxy.toLowerCase().includes(termLower));

		return displayNameMatch || mailMatch || upnMatch || proxyMatch;
	});
}

function formatEntity(entity: AzureEntity): SearchResult {
	return {
		displayName: entity.displayName,
		mail: entity.mail === undefined ? null : entity.mail,
	};
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const searchTerm = searchParams.get('q') || '';

		const [users, groups] = await Promise.all([fetchUsers(false), fetchGroups(false)]);

		const searchTerms = searchTerm ? parseSearchTerms(decodeURIComponent(searchTerm)) : [];

		const uniqueEntities = new Set<string>();
		const uniqueEmails = new Set<string>();
		const matchedEntities = [...users, ...groups]
			.filter((entity) => matchesEntity(entity, searchTerms))
			.map(formatEntity)
			.filter((entity) => {
				if (uniqueEntities.has(entity.displayName)) {
					return false;
				}
				if (entity.mail && uniqueEmails.has(entity.mail)) {
					return false;
				}

				uniqueEntities.add(entity.displayName);
				if (entity.mail) {
					uniqueEmails.add(entity.mail);
				}
				return true;
			})
			.sort((a, b) => {
				// Prioritize exact matches
				const aExactMatch = a.displayName.toLowerCase() === searchTerm.toLowerCase();
				const bExactMatch = b.displayName.toLowerCase() === searchTerm.toLowerCase();
				if (aExactMatch && !bExactMatch) return -1;
				if (!aExactMatch && bExactMatch) return 1;

				// Sort by presence of email
				if (a.mail && !b.mail) return -1;
				if (!a.mail && b.mail) return 1;

				return 0;
			});

		return NextResponse.json({ items: matchedEntities });
	} catch (error) {
		serverLogger.error('Search error:', error);
		return NextResponse.json(
			{ error: 'Search failed', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 },
		);
	}
}
