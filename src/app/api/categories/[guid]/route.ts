/*
This route will be responsible for interacting with a specific category.

Permitted updates:
 - name
 - order
*/
import { NextRequest, NextResponse } from 'next/server';
import { updateCategory, getUserByEmail, insertAuditLog, getCategories } from '@/lib/mysql/queries';
import { setCache } from '@/lib/redis/functions';
import { CATEGORIES_CACHE_KEY, ONE_WEEK_TTL } from '@/constants';
import serverLogger from '@/lib/logging/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { Category } from '@/types';
import { objectDiff } from '@/lib/general';
import { getFromRedisOrFetch } from '@/lib/redis/functions';

async function getCategoryFromCache(guid: string): Promise<Category | null> {
	const categories = await getFromRedisOrFetch<Category[]>(CATEGORIES_CACHE_KEY, async () => getCategories(), ONE_WEEK_TTL);

	return categories?.find((c) => c.id === guid) || null;
}

export async function PUT(request: NextRequest, { params }: { params: { guid: string } }) {
	try {
		const { name, order } = await request.json();
		const { guid } = params;

		if (!name || typeof name !== 'string') {
			return NextResponse.json({ error: 'Invalid name provided' }, { status: 400 });
		}

		const updateData: Partial<Category> = { name };

		if (order !== undefined) {
			if (typeof order !== 'number' || order < 0) {
				return NextResponse.json({ error: 'Invalid order provided' }, { status: 400 });
			}
			updateData.order = order;
		}

		// Get the current user's ID
		const session = await getServerSession(authOptions);
		if (!session || !session.user || !session.user.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await getUserByEmail(session.user.email);
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Get the existing category
		const existingCategory = await getCategoryFromCache(guid);
		if (!existingCategory) {
			return NextResponse.json({ error: 'Category not found' }, { status: 404 });
		}

		// Update the category in MySQL
		await updateCategory({
			id: guid,
			...updateData,
		} as Category);

		// Invalidate cache
		await setCache(CATEGORIES_CACHE_KEY, null);

		// Create a diff of the changes
		const changes = objectDiff(existingCategory, { ...existingCategory, ...updateData });

		// Add audit log entry with changes
		await insertAuditLog({
			actor: user.id,
			action: 'change',
			target: 'category',
			targetId: guid,
			changes: changes,
		});
		serverLogger.info(`[UPDATE] Added audit log entry for updating category: ${guid}`);

		return NextResponse.json({ message: 'Category updated successfully' }, { status: 200 });
	} catch (error) {
		serverLogger.error('Error updating category:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
