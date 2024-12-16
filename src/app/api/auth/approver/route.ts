import { canApprove } from '@/lib/auth/admins';
import { NextResponse } from 'next/server';

export async function GET() {
	try {
		const approverStatus = await canApprove();
		return NextResponse.json({ isApprover: approverStatus });
	} catch (error) {
		console.error('Error checking approver status:', error);
		return NextResponse.json({ isApprover: false });
	}
}
