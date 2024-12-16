export function objectDiff<T extends Record<string, unknown>>(oldObj: T, newObj: T): Partial<T> {
	const diff: Partial<T> = {};
	for (const key in newObj) {
		if (oldObj[key] !== newObj[key]) {
			diff[key] = newObj[key];
		}
	}
	return diff;
}

export function stripAuditLogKeys<T extends Record<string, unknown>>(changes: T): Partial<T> {
	const keysToStrip = ['modifiedBy', 'modifiedById', 'createdById', 'createdAt', 'updatedAt'];
	const strippedChanges: Partial<T> = {};

	for (const key in changes) {
		if (!keysToStrip.includes(key)) {
			strippedChanges[key] = changes[key];
		}
	}

	return strippedChanges;
}
