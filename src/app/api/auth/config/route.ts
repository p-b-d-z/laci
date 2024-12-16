import { NextResponse } from 'next/server';

export async function GET() {
	const oktaConfigured = !!process.env.OKTA_DOMAIN && !!process.env.OKTA_CLIENT_ID && !!process.env.OKTA_CLIENT_SECRET;
	const azureConfigured = !!process.env.AZURE_AD_CLIENT_ID && !!process.env.AZURE_AD_TENANT_ID;

	return NextResponse.json({ oktaConfigured, azureConfigured });
}
