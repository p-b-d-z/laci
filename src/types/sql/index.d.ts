export type Application = {
	id: string;
	name: string;
	createdById?: string;
	modifiedById?: string;
	hitCount: number;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
};

export type Category = {
	id: string;
	name: string;
	order: number;
	description: string;
};

export type Field = {
	id: string;
	name: string;
	order: number;
	description: string;
};

export type Entry = {
	id: string;
	applicationId: string;
	categoryId: string;
	fieldId: string;
	createdById?: string;
	modifiedById: string;
	assignedUsers: string[];
	applicationName?: string;
	categoryName?: string;
	fieldName?: string;
};

export type User = {
	id: string;
	name: string;
	email: string;
	enabled: boolean;
	first_logon: string;
	last_logon: string;
};

export type AuditLogAction = 'add' | 'change' | 'delete' | 'login' | 'logout';
export type AuditLogTarget = 'application' | 'category' | 'field' | 'entry' | 'system';

export type AuditLog = {
	id: string;
	actor: string;
	actor_name?: string;
	action: AuditLogAction;
	target: AuditLogTarget;
	targetId: string | null;
	target_name?: string;
	changes: Record<string, ChangeValue> | null;
	timestamp: Date;
};

export type Approver = {
	id: string;
	type: 'user' | 'group';
	displayName: string;
	identifier: string;
	createdAt: string;
	createdById: string;
};

export type ChangeValue =
	| string
	| number
	| boolean
	| null
	| {
			old?: string | number | boolean | null | undefined;
			new?: string | number | boolean | null | undefined;
	  };

export type QueryParams = (string | number | null)[];

export type ApplicationApproval = {
	applicationId: string;
	approvalId: string;
	approverId: string;
	approvedAt: string;
};
