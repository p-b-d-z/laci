import { NextRequest, NextResponse } from 'next/server';
import { updateCategory, getUserByEmail, insertAuditLog, getCategories } from '@/lib/mysql/queries';
import { setCache, getFromRedisOrFetch } from '@/lib/redis/functions';
import { CATEGORIES_CACHE_KEY, ONE_WEEK_TTL } from '@/constants';
import serverLogger from '@/lib/logging/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/providers';
import { Category } from '@/types';

export async function GET(
	request: NextRequest,
	{ params }: { params: { guid: string } },
): Promise<NextResponse<{ description: string } | { error: string }>> {
	try {
		const { guid } = params;
		const categories = await getFromRedisOrFetch<Category[]>(CATEGORIES_CACHE_KEY, async () => getCategories(), ONE_WEEK_TTL);

		const category = categories?.find((c) => c.id === guid);
		if (!category) {
			return NextResponse.json({ error: 'Category not found' }, { status: 404 });
		}

		return NextResponse.json({ description: category.description || '' }, { status: 200 });
	} catch (error) {
		serverLogger.error('Error getting category description:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: { guid: string } },
): Promise<NextResponse<{ message: string } | { error: string }>> {
	try {
		const { description } = (await request.json()) as { description: unknown };
		const { guid } = params;

		if (typeof description !== 'string') {
			return NextResponse.json({ error: 'Invalid description provided' }, { status: 400 });
		}

		const session = await getServerSession(authOptions);
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await getUserByEmail(session.user.email);
		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const existingCategories = await getFromRedisOrFetch<Category[]>(CATEGORIES_CACHE_KEY, async () => getCategories(), ONE_WEEK_TTL);

		const existingCategory = existingCategories?.find((c) => c.id === guid);
		if (!existingCategory) {
			return NextResponse.json({ error: 'Category not found' }, { status: 404 });
		}

		const updatedCategory: Category = {
			...existingCategory,
			description,
		};

		await updateCategory(updatedCategory);
		await setCache(CATEGORIES_CACHE_KEY, null);

		await insertAuditLog({
			actor: user.id,
			action: 'change',
			target: 'category',
			targetId: guid,
			changes: {
				description: {
					old: existingCategory.description || '',
					new: description,
				},
			},
		});
		serverLogger.info(`[UPDATE] Added audit log entry for updating category description: ${guid}`);

		return NextResponse.json({ message: 'Category description updated successfully' }, { status: 200 });
	} catch (error) {
		serverLogger.error('Error updating category description:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
