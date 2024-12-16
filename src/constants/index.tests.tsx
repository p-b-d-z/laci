import { v4 as uuidv4 } from 'uuid';
import { Application, Approver, AzureEntity, CustomSession, Entry, User } from '@/types';

/* Constants used for testing */
export const TEST_BASE_URL = 'http://localhost:3000';
export const mockEmail = 'test@example.com';
export const mockAssignedUser1 = 'Homer Simpson';
export const mockAssignedUser2 = `${mockAssignedUser1} <${mockEmail}>`;
export const mockApplication: Application = {
	id: uuidv4(),
	name: 'Test App',
	enabled: true,
	hitCount: 0,
	createdById: uuidv4(),
	modifiedById: uuidv4(),
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};
export const mockApplicationDisabled: Application = {
	id: uuidv4(),
	name: 'Test Disabled App',
	enabled: false,
	hitCount: 0,
	createdById: uuidv4(),
	modifiedById: uuidv4(),
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};
export const mockCategory = {
	id: uuidv4(),
	name: 'Operating System',
	order: 0,
	description: 'Mock of Operating System category',
};

export const mockCategories = [mockCategory];

export const mockField = {
	id: uuidv4(),
	name: 'Laborer',
	order: 1,
	description: 'Mock of Laborer field',
};

export const mockFields = [mockField];

export const mockUser: User = {
	id: uuidv4(),
	email: mockEmail,
	name: 'Test User',
	enabled: true,
	first_logon: new Date().toISOString(),
	last_logon: new Date().toISOString(),
};

export const mockEntry: Entry = {
	id: uuidv4(),
	applicationId: mockApplication.id,
	categoryId: mockCategory.id,
	fieldId: mockField.id,
	modifiedById: mockUser.id,
	assignedUsers: [mockAssignedUser1, mockAssignedUser2],
};

export const mockSession: CustomSession = {
	user: {
		email: mockUser.email,
		name: mockUser.name,
	},
	expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const mockApproverGroup: Approver = {
	id: uuidv4(),
	type: 'group',
	displayName: 'Test Security Group',
	identifier: 'security_group@testdomain.com',
	createdAt: new Date().toISOString(),
	createdById: mockUser.id,
};

export const mockApproverUser: Approver = {
	id: uuidv4(),
	type: 'group',
	displayName: 'Test Security Group',
	identifier: 'security_group@testdomain.com',
	createdAt: new Date().toISOString(),
	createdById: mockUser.id,
};

export const mockAuditLog = {
	id: uuidv4(),
	actor: mockUser.id,
	actor_name: '',
	action: 'add' as const,
	target: 'application' as const,
	targetId: mockApplication.id,
	target_name: '',
	changes: {
		hitCount: mockApplication.hitCount,
	},
	timestamp: new Date(),
};

export const mockAuditLogOlderDate = {
	id: uuidv4(),
	actor: mockUser.id,
	actor_name: '',
	action: 'add' as const,
	target: 'application' as const,
	targetId: mockApplication.id,
	target_name: '',
	changes: {
		id: mockApplication.id,
		hitCount: mockApplication.hitCount,
	},
	timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
};

export const mockAuditLogRecentDate = {
	id: uuidv4(),
	actor: mockUser.id,
	actor_name: '',
	action: 'add' as const,
	target: 'application' as const,
	targetId: mockApplication.id,
	target_name: '',
	changes: {
		id: mockApplication.id,
		hitCount: mockApplication.hitCount,
	},
	timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
};

export const mockAzureUsers: AzureEntity[] = [
	{
		id: '1',
		displayName: 'Test User',
		mail: 'test.user@example.com',
		userPrincipalName: 'test.user@example.com',
		proxyAddresses: ['SMTP:test.user@example.com'],
	},
	{
		id: '2',
		displayName: 'Another User',
		mail: 'another.user@example.com',
		userPrincipalName: 'another.user@example.com',
		proxyAddresses: ['SMTP:another.user@example.com'],
	},
];

export const mockAzureGroups: AzureEntity[] = [
	{
		id: '3',
		displayName: 'Test Group',
		mail: 'test.group@example.com',
		proxyAddresses: ['SMTP:test.group@example.com'],
	},
	{
		id: '4',
		displayName: 'Another Group',
		mail: null,
		proxyAddresses: [],
	},
];
