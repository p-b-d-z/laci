import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getApplications, getAuditLogsAfterId, getFields, getCategories } from '@/lib/mysql/queries';
import { getFromRedisOrFetch, setCache } from '@/lib/redis/functions';
import { Application, AuditLog, CachedAuditData, User, Field, Category } from '@/types';
import {
	APPLICATIONS_CACHE_KEY,
	AUDIT_LOGS_CACHE_KEY,
	AUDIT_LOGS_CACHE_TTL,
	ONE_WEEK_TTL,
	USERS_CACHE_KEY,
	FIELDS_CACHE_KEY,
	CATEGORIES_CACHE_KEY,
} from '@/constants';

async function fetchUsers(): Promise<User[]> {
	return getFromRedisOrFetch<User[]>(USERS_CACHE_KEY, getAllUsers, ONE_WEEK_TTL);
}

async function fetchApplications(): Promise<Application[]> {
	return getFromRedisOrFetch<Application[]>(APPLICATIONS_CACHE_KEY, getApplications, ONE_WEEK_TTL);
}

async function fetchFields(): Promise<Field[]> {
	return getFromRedisOrFetch<Field[]>(FIELDS_CACHE_KEY, getFields, ONE_WEEK_TTL);
}

async function fetchCategories(): Promise<Category[]> {
	return getFromRedisOrFetch<Category[]>(CATEGORIES_CACHE_KEY, getCategories, ONE_WEEK_TTL);
}

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const requestedDays = searchParams.get('lastDays') ? parseInt(searchParams.get('lastDays')!, 10) : 30;

	const cachedData = await getFromRedisOrFetch<CachedAuditData>(
		AUDIT_LOGS_CACHE_KEY,
		async () => {
			const logs = await getAuditLogsAfterId(null, requestedDays);
			return { lastDays: requestedDays, logs };
		},
		AUDIT_LOGS_CACHE_TTL,
	);

	let auditLogs: AuditLog[];

	if (requestedDays <= cachedData.lastDays) {
		// Filter cached logs based on requested days
		const cutoffDate = new Date(Date.now() - requestedDays * 24 * 60 * 60 * 1000);
		auditLogs = cachedData.logs.filter((log) => new Date(log.timestamp) >= cutoffDate);
	} else {
		// Fetch additional logs
		const lastLogId = cachedData.logs[0]?.id || null;
		const additionalLogs = await getAuditLogsAfterId(lastLogId, requestedDays - cachedData.lastDays);
		auditLogs = [...additionalLogs, ...cachedData.logs];

		// Update cache with new data
		const newCachedData: CachedAuditData = {
			lastDays: requestedDays,
			logs: auditLogs,
		};
		await setCache(AUDIT_LOGS_CACHE_KEY, newCachedData, AUDIT_LOGS_CACHE_TTL);
	}

	// Fetch all required data
	const [users, applications, fields, categories] = await Promise.all([
		fetchUsers(),
		fetchApplications(),
		fetchFields(),
		fetchCategories(),
	]);

	// Create maps for quick lookup
	const userMap = new Map(users.map((user) => [user.id, user.name]));
	const applicationMap = new Map(applications.map((app) => [app.id, app.name]));
	const fieldMap = new Map(fields.map((field) => [field.id, field.name]));
	const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

	// Extend audit logs with names
	const extendedAuditLogs = auditLogs.map((log) => ({
		...log,
		actor_name: userMap.get(log.actor) || 'Unknown',
		target_name: getTargetName(log, applicationMap, fieldMap, categoryMap),
	}));

	return NextResponse.json(extendedAuditLogs);
}

function getTargetName(
	log: AuditLog,
	applicationMap: Map<string, string>,
	fieldMap: Map<string, string>,
	categoryMap: Map<string, string>,
): string {
	if (!log.targetId) return 'Unknown';

	switch (log.target) {
		case 'application':
			return applicationMap.get(log.targetId) || log.targetId;
		case 'field':
			return fieldMap.get(log.targetId) || log.targetId;
		case 'category':
			return categoryMap.get(log.targetId) || log.targetId;
		default:
			return log.targetId;
	}
}
