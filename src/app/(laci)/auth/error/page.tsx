import { Error } from '@/components/client/error';
import '@/styles/globals.css';

type AuthErrorTypes = {
	[key: string]: {
		title: string;
		description: string;
	};
};

const AUTH_ERRORS: AuthErrorTypes = {
	Configuration: {
		title: 'Authentication Configuration Error',
		description: 'There is a problem with the authentication configuration. Please contact your administrator.',
	},
	AccessDenied: {
		title: 'Access Denied',
		description: 'You do not have permission to access this resource. Please sign in with an authorized account.',
	},
	Verification: {
		title: 'Verification Error',
		description: 'The verification link is invalid or has expired. Please try signing in again.',
	},
	Default: {
		title: 'Authentication Error',
		description: 'An error occurred during authentication. Please try again later.',
	},
};

export default function AuthError({ searchParams }: { searchParams: { error?: string } }) {
	const errorType = searchParams.error;
	const error = errorType ? AUTH_ERRORS[errorType] || AUTH_ERRORS.Default : AUTH_ERRORS.Default;

	return (
		<Error
			title={error.title}
			description={error.description}
			details={errorType}
		/>
	);
}
