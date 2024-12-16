import { NextResponse } from 'next/server';
import { getCache, setCache, clearCache } from '@/lib/redis/functions';
import { APPLICATION_APPROVALS_CACHE_KEY, ENTRY_CACHE_KEY } from '@/constants';
import { v4 as uuidv4 } from 'uuid';
import serverLogger from '@/lib/logging/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { addEntry, updateEntry, getUserByEmail, getEntriesByApplicationId, insertAuditLog } from '@/lib/mysql/queries';
import { getFromRedisOrFetch } from '@/lib/redis/functions';
import { DEFAULT_TTL } from '@/constants';
import { Entry, ChangeValue } from '@/types';
import { objectDiff, stripAuditLogKeys } from '@/lib/general';

export async function GET(request: Request, { params }: { params: { applicationId: string } }) {
	const { applicationId } = params;
	const cacheKey = `${ENTRY_CACHE_KEY}:${applicationId}`;

	try {
		const laciEntries = await getFromRedisOrFetch<Entry[]>(cacheKey, () => getEntriesByApplicationId(applicationId), DEFAULT_TTL);

		return NextResponse.json(laciEntries);
	} catch (error) {
		serverLogger.error('Error fetching entries:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

export async function POST(request: Request, { params }: { params: { applicationId: string } }) {
	return handleLaciEntryRequest(request, { params });
}

export async function PUT(request: Request, { params }: { params: { applicationId: string; entryId: string } }) {
	return handleLaciEntryRequest(request, { params });
}

async function handleLaciEntryRequest(request: Request, { params }: { params: { applicationId: string; entryId?: string } }) {
	try {
		const { applicationId } = params;
		const { assignedUsers, categoryId, fieldId } = await request.json();

		if (!Array.isArray(assignedUsers) || !categoryId || !fieldId) {
			return NextResponse.json({ error: 'Invalid entry data: missing required fields' }, { status: 400 });
		}

		const session = await getServerSession(authOptions);
		if (!session || !session.user || !session.user.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await getUserByEmail(session.user.email);

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const userId = user.id;

		let entry: Entry;
		let status: number;
		let action: 'add' | 'change';
		let changes: Record<string, unknown> = {};

		// Check if an entry already exists for this application, category, and field
		const existingEntries = await getEntriesByApplicationId(applicationId);
		const existingEntry = existingEntries.find((e: Entry) => e.categoryId === categoryId && e.fieldId === fieldId);

		/* Create or modify entry */
		if (existingEntry) {
			const updatedEntry = {
				...existingEntry,
				assignedUsers,
				modifiedById: userId,
			};

			changes = stripAuditLogKeys(objectDiff(existingEntry, updatedEntry));
			await updateEntry(updatedEntry);
			entry = updatedEntry;
			status = 200;
			action = 'change';
		} else {
			entry = {
				id: uuidv4(),
				applicationId,
				categoryId,
				fieldId,
				assignedUsers,
				createdById: userId,
				modifiedById: userId,
			};

			changes = stripAuditLogKeys(entry);
			await addEntry(entry);
			status = 201;
			action = 'add';
		}

		// Add audit log
		await insertAuditLog({
			actor: userId,
			action: action,
			target: 'entry',
			targetId: entry.id,
			changes: changes as Record<string, ChangeValue>,
		});

		// Update cache after modifying data
		serverLogger.info(`[PUT] Updating cache for application ${applicationId}`);
		const cacheKey = `${ENTRY_CACHE_KEY}:${applicationId}`;
		const approvalKey = `${APPLICATION_APPROVALS_CACHE_KEY}`;
		await clearCache(approvalKey);
		await setCache(cacheKey, async () => {
			const cachedEntries = (await getCache(cacheKey)) as Entry[] | null;
			if (cachedEntries) {
				const updatedEntries = cachedEntries.map((cachedEntry) => (cachedEntry.id === entry.id ? entry : cachedEntry));
				if (!updatedEntries.some((cachedEntry) => cachedEntry.id === entry.id)) {
					updatedEntries.push(entry);
				}
				return updatedEntries;
			}
			return null;
		});

		// Clear cache for each assigned user
		serverLogger.info(`[PUT] Clearing cache for assigned users: ${assignedUsers}`);
		for (const assignedUser of assignedUsers) {
			const emailMatch = assignedUser.match(/<(.+@.+)>/);
			if (emailMatch) {
				const email = emailMatch[1];
				const userCacheKey = `user:${email}:responsibilities`;
				await clearCache(userCacheKey);
			}
		}

		return NextResponse.json(entry, { status });
	} catch (error) {
		serverLogger.error('Error creating/updating entry:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
