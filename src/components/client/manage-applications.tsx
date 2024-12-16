'use client';

import React, { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { CreatedApplication } from '@/types';

export function ManageApplications() {
	const [applicationNames, setApplicationNames] = useState<string[]>(['']);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const isValid = useMemo(() => {
		return applicationNames.every((name) => {
			const trimmedName = name.trim();
			return trimmedName.length >= 2 && /^[A-Za-z0-9\s.]+$/.test(trimmedName);
		});
	}, [applicationNames]);

	const handleSubmitApplications = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isValid) return;
		setIsLoading(true);
		setError('');

		for (const name of applicationNames) {
			if (name.trim()) {
				try {
					const response = await fetch('/api/applications', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ name }),
					});

					if (!response.ok) {
						const data = await response.json();
						throw new Error(data.message || 'Failed to create application');
					}

					const newApplication: CreatedApplication = await response.json();
					toast.success(
						<div className="flex items-center space-x-2">
							<span>Created: {newApplication.name}</span>
						</div>,
						{ duration: 5000 },
					);
				} catch (err) {
					toast.error(err instanceof Error ? err.message : 'An error occurred');
				}
			}
		}

		setApplicationNames(['']);
		setIsLoading(false);
	};

	const handleAddApplication = () => {
		setApplicationNames([...applicationNames, '']);
	};

	const handleRemoveApplication = (index: number) => {
		const newApplicationNames = applicationNames.filter((_, i) => i !== index);
		setApplicationNames(newApplicationNames.length > 0 ? newApplicationNames : ['']);
	};

	const handleApplicationNameChange = (index: number, value: string) => {
		const newApplicationNames = [...applicationNames];
		newApplicationNames[index] = value;
		setApplicationNames(newApplicationNames);
	};

	return (
		<section className="bg-gray-100 rounded-lg p-3">
			<h2 className="text-lg font-semibold mb-2">Create Application</h2>
			<form
				onSubmit={handleSubmitApplications}
				className="space-y-2"
			>
				{applicationNames.map((name, index) => (
					<div
						key={index}
						className="flex flex-col space-y-1"
					>
						<div className="flex items-center space-x-2">
							<input
								type="text"
								value={name}
								onChange={(e) => handleApplicationNameChange(index, e.target.value)}
								className={`flex-grow p-1.5 border rounded ${
									name.trim().length < 3 || !/^[A-Za-z0-9\s.]+$/.test(name.trim()) ? 'border-red-500' : ''
								}`}
								placeholder="Enter application name"
								required
							/>
							<div className="flex space-x-1">
								{applicationNames.length > 1 && (
									<button
										type="button"
										onClick={() => handleRemoveApplication(index)}
										className="bg-red-500 text-white p-1 rounded"
									>
										-
									</button>
								)}
								{index === applicationNames.length - 1 && (
									<button
										type="button"
										onClick={handleAddApplication}
										className="bg-blue-500 text-white p-1 rounded"
									>
										+
									</button>
								)}
							</div>
						</div>
						{name.trim().length < 2 && (
							<p className="text-red-500 text-xs">Application name must be at least 2 characters long</p>
						)}
						{!/^[A-Za-z0-9\s.]+$/.test(name.trim()) && name.trim().length > 0 && (
							<p className="text-red-500 text-xs">
								Application name is limited to ASCII characters: A-Z a-z 0-9, spaces, and periods
							</p>
						)}
					</div>
				))}
				<button
					type="submit"
					disabled={isLoading || !isValid}
					className={`w-full p-1.5 rounded ${
						isValid ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
					}`}
				>
					{isLoading ? 'Creating...' : 'Create Application(s)'}
				</button>
			</form>
			{error && <p className="text-red-500 mt-2">{error}</p>}
		</section>
	);
}
