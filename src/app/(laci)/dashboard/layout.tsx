import React from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-screen">
			<main className="flex-1 overflow-y-auto p-6">{children}</main>
		</div>
	);
}
