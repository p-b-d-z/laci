/* AWS */
export const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
export const REGION = process.env.REGION || 'us-west-2';

/* Azure */
export const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID || '';
export const AZURE_AD_CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET || '';
export const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID || '';

/* Okta */
export const OKTA_CLIENT_ID = process.env.OKTA_CLIENT_ID || '';
export const OKTA_CLIENT_SECRET = process.env.OKTA_CLIENT_SECRET || '';
export const OKTA_DOMAIN = process.env.OKTA_DOMAIN || '';

export const PROVIDER_ICONS: Record<string, string> = {
	'azure-ad': 'lucide:pyramid',
	okta: 'lucide:ship-wheel',
};

/* Redis Cache Keys */
export const APPLICATION_APPROVALS_CACHE_KEY = 'application_approvals';
export const APPROVERS_CACHE_KEY = 'approvers';
export const AUDIT_LOGS_CACHE_KEY = 'audit_logs';
export const AZURE_GROUPS_CACHE_KEY = 'azure_groups';
export const AZURE_USERS_CACHE_KEY = 'azure_users';
export const CATEGORIES_CACHE_KEY = 'categories';
export const FIELDS_CACHE_KEY = 'fields';
export const APPLICATIONS_CACHE_KEY = 'applications';
export const ENTRY_CACHE_KEY = 'entries';
export const USERS_CACHE_KEY = 'users';

/* Redis Cache timers */
export const AUDIT_LOGS_CACHE_TTL = 3600;
export const DEFAULT_TTL = 86400;
export const ONE_HOUR_TTL = 3600;
export const ONE_WEEK_TTL = 604800;

/* Generic helper functions */
export function removeLineBreaks(str: string): string {
	return str.replace(/(\r\n|\n|\r)/gm, ' ').trim();
}

/* Authentication and Access Control*/
export const isOktaConfigured = OKTA_DOMAIN !== '' && OKTA_CLIENT_ID !== '' && OKTA_CLIENT_SECRET !== '';
export const isAzureConfigured = AZURE_AD_CLIENT_ID !== '' && AZURE_AD_TENANT_ID !== '';
export const ADMIN_GROUPS = ['LACI Administrators'] as string[];

type RouteAccess = 'admin' | 'authenticated';

export const ROUTE_ACCESS_RULES: Record<string, RouteAccess[]> = {
	'/approvers': ['admin'],
	'/dashboard/audit': ['admin'],
	'/dashboard/manage': ['admin'],
	'/dashboard': ['authenticated'],
	'/help': ['authenticated'],
	'/settings': ['authenticated'],
};
