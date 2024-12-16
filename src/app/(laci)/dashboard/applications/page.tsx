/*
This page will be responsible for displaying the applications dashboard with the searchable list of applications.
*/

import { Application } from '@/types';
import { ApplicationSearch } from '@/components/client/application-search';
import { RefreshButton } from '@/components/client/refresh-button';
import {
	APPLICATIONS_CACHE_KEY,
	AZURE_GROUPS_CACHE_KEY,
	FIELDS_CACHE_KEY,
	CATEGORIES_CACHE_KEY,
	AZURE_USERS_CACHE_KEY,
	APPLICATION_APPROVALS_CACHE_KEY,
} from '@/constants';
import { getCache } from '@/lib/redis/functions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { Error } from '@/components/client/error';

async function fillCache() {
	// Check and fill cache only if needed
	const azureGroups = await getCache(AZURE_GROUPS_CACHE_KEY);
	const azureUsers = await getCache(AZURE_USERS_CACHE_KEY);
	const fields = await getCache(FIELDS_CACHE_KEY);
	const categories = await getCache(CATEGORIES_CACHE_KEY);

	if (!azureGroups) {
		fetch(`${process.env.NEXTAUTH_URL}/api/azure/groups`).catch(console.error);
	}
	if (!azureUsers) {
		fetch(`${process.env.NEXTAUTH_URL}/api/azure/users`).catch(console.error);
	}
	if (!fields) {
		fetch(`${process.env.NEXTAUTH_URL}/api/fields`).catch(console.error);
	}
	if (!categories) {
		fetch(`${process.env.NEXTAUTH_URL}/api/categories`).catch(console.error);
	}
}

async function getApplications(): Promise<Application[]> {
	await fillCache();
	const applications = await getCache<Application[]>(APPLICATIONS_CACHE_KEY);
	if (!applications) {
		try {
			const response = await fetch(`${process.env.NEXTAUTH_URL}/api/applications`, {
				headers: { 'Content-Type': 'application/json' },
			});
			const data = await response.json();
			return Array.isArray(data) ? data : [];
		} catch {
			return [];
		}
	}
	return Array.isArray(applications) ? applications : [];
}

export default async function ApplicationsPage() {
	const session = await getServerSession(authOptions);
	if (!session || !session.user) {
		return (
			<Error
				title="401"
				description="Unauthorized. Please log in."
			/>
		);
	}
	const applications = await getApplications();

	// Sort applications by hitCount in descending order
	const sortedApplications = applications.sort((a, b) => b.hitCount - a.hitCount);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold">Applications Dashboard</h1>
				<RefreshButton cacheKeys={[APPLICATIONS_CACHE_KEY, APPLICATION_APPROVALS_CACHE_KEY]} />
			</div>
			<ApplicationSearch initialApplications={sortedApplications} />
		</div>
	);
}
