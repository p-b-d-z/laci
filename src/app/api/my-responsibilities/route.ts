import { NextRequest } from 'next/server';
import { getFromRedisOrFetch, setCache } from '@/lib/redis/functions';
import { ONE_HOUR_TTL } from '@/constants';
import { Category, Field, Entry } from '@/types';
import { CustomSession, StreamData } from '@/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import serverLogger from '@/lib/logging/server';
import { getCategories, getFields, getEntriesByApplicationId } from '@/lib/mysql/queries';
import { CATEGORIES_CACHE_KEY, FIELDS_CACHE_KEY, ENTRY_CACHE_KEY } from '@/constants';
import { getApplications } from '@/lib/mysql/queries';
import { APPLICATIONS_CACHE_KEY } from '@/constants';
import { Application } from '@/types';

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const userEmail = searchParams.get('email');
	const userName = searchParams.get('name');
	const showDisabled = searchParams.get('showDisabled') === 'true';

	serverLogger.debug(`Fetching responsibilities for user: ${userEmail}, name: ${userName}, showDisabled: ${showDisabled}`);

	if (!userEmail) {
		serverLogger.info('User email is missing');
		return new Response('User email is required', { status: 400 });
	}

	const session = (await getServerSession(authOptions)) as CustomSession | null;
	const userGroups = session?.user?.groups || [];
	// serverLogger.debug('User groups:', userGroups);

	const userCacheKey = `user:${userEmail}:responsibilities`;

	const cachedResponsibilities = await getFromRedisOrFetch<StreamData[]>(userCacheKey, async () => [], ONE_HOUR_TTL);
	serverLogger.debug('Cached responsibilities:', JSON.stringify(cachedResponsibilities));

	if (cachedResponsibilities.length > 0) {
		serverLogger.info('Returning cached responsibilities');
		return new Response(cachedResponsibilities.map((data) => JSON.stringify(data) + '\n').join(''), {
			headers: { 'Content-Type': 'application/x-ndjson' },
		});
	}

	const encoder = new TextEncoder();
	const stream = new TransformStream();
	const writer = stream.writable.getWriter();

	const writeToStream = async (data: StreamData) => {
		await writer.write(encoder.encode(JSON.stringify(data) + '\n'));
	};

	const processApplications = async () => {
		try {
			const applications = await getFromRedisOrFetch<Application[]>(APPLICATIONS_CACHE_KEY, getApplications, ONE_HOUR_TTL);

			const filteredApplications = showDisabled ? applications : applications.filter((app) => app.enabled);
			serverLogger.info(`Fetched ${filteredApplications.length} applications`);

			if (filteredApplications.length === 0) {
				serverLogger.info('No applications found');
				await writeToStream({ type: 'error', message: 'No applications found' });
				return;
			}

			const categories = await getFromRedisOrFetch(CATEGORIES_CACHE_KEY, getCategories, ONE_HOUR_TTL);

			const entryFields = await getFromRedisOrFetch(FIELDS_CACHE_KEY, getFields, ONE_HOUR_TTL);

			if (!categories || !entryFields) {
				serverLogger.error('Failed to fetch categories or fields');
				throw new Error('Failed to fetch categories or fields');
			}

			const allStreamData: StreamData[] = [];
			let totalMatchingEntries = 0;
			let processedCount = 0;

			for (const app of filteredApplications) {
				const entries = await getFromRedisOrFetch<Entry[]>(
					`${ENTRY_CACHE_KEY}:${app.id}`,
					() => getEntriesByApplicationId(app.id),
					ONE_HOUR_TTL,
				);
				serverLogger.info(`Fetched ${entries.length} entries for application ${app.id}`);

				const filteredEntries = entries
					.filter((entry) =>
						entry.assignedUsers.some((user) => {
							const matchesEmail = user.toLowerCase().includes(userEmail.toLowerCase());
							const matchesName = userName ? user.toLowerCase().includes(userName.toLowerCase()) : false;
							const matchesGroup = userGroups.some((group: string) => user.toLowerCase().includes(group.toLowerCase()));

							return matchesEmail || matchesName || matchesGroup;
						}),
					)
					.map((entry) => ({
						...entry,
						applicationName: app.name,
						categoryName: categories.find((c: Category) => c.id === entry.categoryId)?.name || '',
						fieldName: entryFields.find((t: Field) => t.id === entry.fieldId)?.name || '',
					}));

				totalMatchingEntries += filteredEntries.length;
				processedCount++;

				if (filteredEntries.length > 0) {
					allStreamData.push({ type: 'assignments', data: filteredEntries });
				}
			}

			await writeToStream({ type: 'total', count: totalMatchingEntries });
			await writeToStream({ type: 'progress', processed: processedCount });
			allStreamData.push({ type: 'done' });

			serverLogger.debug(`Caching results for user: ${userEmail}`);
			serverLogger.debug(`[api] Cached data: ${JSON.stringify(allStreamData)}`);
			await setCache(userCacheKey, allStreamData, ONE_HOUR_TTL);

			// Write all data to the stream
			for (const data of allStreamData) {
				await writeToStream(data);
			}
		} catch (error) {
			serverLogger.error('Error processing applications:', error);
			await writeToStream({ type: 'error', message: 'Internal Server Error' });
		} finally {
			await writer.close();
		}
	};

	processApplications();

	return new Response(stream.readable, {
		headers: { 'Content-Type': 'application/x-ndjson' },
	});
}
