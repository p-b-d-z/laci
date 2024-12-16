'use client';

import React, { useEffect, useState } from 'react';
import '@/styles/globals.css';

export default function HealthCheck() {
	const [mysqlStatus, setMysqlStatus] = useState({
		status: 'Unknown',
		message: 'Unknown',
	});
	const [redisStatus, setRedisStatus] = useState({
		connectionHost: 'Unknown',
		connectionStatus: 'Unknown',
		canRead: 'Unknown',
		canWrite: 'Unknown',
	});

	useEffect(() => {
		async function fetchMysqlStatus() {
			try {
				const response = await fetch('/api/health/mysql');
				const data = await response.json();
				setMysqlStatus(data);
			} catch (error) {
				console.error('Failed to fetch MySQL status:', error);
				setMysqlStatus({
					status: 'error',
					message: 'Failed to fetch MySQL status',
				});
			}
		}

		async function fetchRedisStatus() {
			try {
				const response = await fetch('/api/health/redis');
				const data = await response.json();
				setRedisStatus(data);
			} catch (error) {
				console.error('Failed to fetch Redis status:', error);
			}
		}

		fetchMysqlStatus();
		fetchRedisStatus();
	}, []);

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<div className="mb-8">
				<h1 className="text-2xl font-bold mb-2">System Health Status</h1>
				<div className="h-1 w-20 bg-blue-500"></div>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
					<h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">MySQL Status</h2>
					<div className="space-y-2">
						<div className="flex items-center">
							<span className="font-medium mr-2">Status:</span>
							<span className={`${mysqlStatus.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
								{mysqlStatus.status}
							</span>
						</div>
						<div className="flex items-center">
							<span className="font-medium mr-2">Message:</span>
							<span>{mysqlStatus.message}</span>
						</div>
					</div>
				</div>

				<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
					<h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">Redis Status</h2>
					<div className="space-y-2">
						<div className="flex items-center">
							<span className="font-medium mr-2">Connection Status:</span>
							<span className={`${redisStatus.connectionStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
								{redisStatus.connectionStatus}
							</span>
						</div>
						<div className="flex items-center">
							<span className="font-medium mr-2">Can Read:</span>
							<span className={`${redisStatus.canRead === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
								{redisStatus.canRead}
							</span>
						</div>
						<div className="flex items-center">
							<span className="font-medium mr-2">Can Write:</span>
							<span className={`${redisStatus.canWrite === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
								{redisStatus.canWrite}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
