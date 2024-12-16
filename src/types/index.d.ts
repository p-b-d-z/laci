import { AuditLog } from '@/types/sql';

export type CreateUserInput = {
	name: string;
	email: string;
};

export type RedisValue = {
	status: string;
};

export type MmmmCookie = {
	theme: string;
};

export type StreamData =
	| { type: 'error'; message: string }
	| { type: 'total'; count: number }
	| { type: 'progress'; processed: number }
	| { type: 'assignments'; data: Array<Entry & { applicationName: string; categoryName: string; fieldName: string }> }
	| { type: 'done' };

/* Component interfaces */
export type DeleteApplicationButtonProps = {
	applicationId: string;
	applicationName: string;
};

export type LaciEntryEditorProps = {
	applicationId: string;
	categoryId: string;
	fieldId: string;
	initialEntry?: EntrySSMRecord;
};

export type CreatedApplication = {
	id: string;
	name: string;
};

export type ReorderableItemProps = {
	id: string;
	name: string;
	order: number;
	description?: string;
	isFirst: boolean;
	isLast: boolean;
	onMoveUp: (id: string) => Promise<void>;
	onMoveDown: (id: string) => Promise<void>;
	onEdit?: (id: string, description: string) => Promise<void>;
};

export type MyResponsibilitiesProps = {
	userEmail: string;
	userName?: string | null;
	showDisabled: boolean;
};

export type RefreshButtonProps = {
	cacheKeys: string[];
	onRefresh?: () => void;
};

export interface DisableApplicationButtonProps {
	applicationId: string;
	initialEnabled: boolean;
}

export interface ProgressBarProps {
	processed: number;
	total: number;
}

export type ApprovalButtonProps = {
	applicationId: string;
	initialApproved: boolean;
};

export type ApprovalStatus = {
	approverId: string;
	approvedAt: string;
	approved: boolean;
} | null;

export type SearchResult = {
	displayName: string;
	mail: string | null;
};

export type CachedAuditData = {
	lastDays: number;
	logs: AuditLog[];
};

export * from './auth';
export * from './logging';
export * from './react';
export * from './ssm';
export * from './sql';
