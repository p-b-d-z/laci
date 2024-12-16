export function formatDate(date: string | Date): string {
	const d = typeof date === 'string' ? new Date(date) : date;

	const year = d.getUTCFullYear();
	const month = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	const hours = String(d.getUTCHours()).padStart(2, '0');
	const minutes = String(d.getUTCMinutes()).padStart(2, '0');

	return `${month}-${day}-${year} ${hours}:${minutes} (UTC)`;
}

type ChangeValue =
	| string
	| number
	| boolean
	| null
	| {
			old?: string | number | boolean | null | undefined;
			new?: string | number | boolean | null | undefined;
	  };

export function formatChanges(changes: string | Record<string, ChangeValue> | null): string {
	if (!changes) return 'No changes';

	let changesObj: Record<string, ChangeValue>;

	if (typeof changes === 'string') {
		try {
			changesObj = JSON.parse(changes);
		} catch (error) {
			return 'Invalid changes format';
		}
	} else {
		changesObj = changes;
	}

	return Object.entries(changesObj)
		.map(([key, value]) => {
			if (key === 'assignedUsers') {
				if (Array.isArray(value)) {
					return `${key}: ${value.join(', ')}`;
				} else {
					return `${key}: ${JSON.stringify(value)}`;
				}
			} else if (typeof value === 'object' && value !== null) {
				const oldValue = value.old !== undefined ? JSON.stringify(value.old) : 'N/A';
				const newValue = value.new !== undefined ? JSON.stringify(value.new) : 'N/A';
				return `${key}: Old: ${oldValue} | New: ${newValue}`;
			} else {
				return `${key}: ${JSON.stringify(value)}`;
			}
		})
		.join('\n');
}

export function formatNameForUrl(name: string): string {
	return name.toLowerCase().replace(/\s+/g, '-');
}
