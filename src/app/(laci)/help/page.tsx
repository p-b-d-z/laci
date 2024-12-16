import { Category, Field } from '@/types';
import { headers } from 'next/headers';
import { Error } from '@/components/client/error';

const formatDescription = (description: string) => {
	if (description) {
		return description.replace(/\r?\n/g, '<br />');
	} else {
		return '';
	}
};

async function getCategories(fetchOptions: RequestInit): Promise<{ data: Category[] | null; error?: string }> {
	const res = await fetch(`${process.env.NEXTAUTH_URL}/api/categories`, fetchOptions);
	if (!res.ok) {
		return { data: null, error: 'Failed to fetch categories' };
	}
	return { data: await res.json() };
}

async function getFields(fetchOptions: RequestInit): Promise<{ data: Field[] | null; error?: string }> {
	const res = await fetch(`${process.env.NEXTAUTH_URL}/api/fields`, fetchOptions);
	if (!res.ok) {
		return { data: null, error: 'Failed to fetch fields' };
	}
	return { data: await res.json() };
}

async function HelpPage() {
	const headersList = headers();
	const fetchOptions = {
		headers: {
			'Content-Type': 'application/json',
			Cookie: headersList.get('cookie') || '',
		},
		cache: 'no-store' as const,
	};

	const [fieldsResult, categoriesResult] = await Promise.all([getFields(fetchOptions), getCategories(fetchOptions)]);

	if (fieldsResult.error || categoriesResult.error) {
		return (
			<Error
				title="Failed to Load Help Page"
				description="Unable to load the required data for the help page."
				details={fieldsResult.error || categoriesResult.error}
			/>
		);
	}

	const sortedFields = [...fieldsResult.data!].sort((a, b) => a.order - b.order);
	const sortedCategories = [...categoriesResult.data!].sort((a, b) => a.order - b.order);

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="w-3/4 mx-auto space-y-8">
				<section>
					<h2 className="text-2xl font-bold mb-4">Roles</h2>
					<div className="overflow-x-auto">
						<table className="min-w-full bg-white shadow-md rounded-lg">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Name</th>
									<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Description</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{sortedFields.map((field) => (
									<tr key={field.id}>
										<td className="px-6 py-4 whitespace-nowrap">{field.name}</td>
										<td
											className="px-6 py-4"
											dangerouslySetInnerHTML={{ __html: formatDescription(field.description) }}
										/>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-4">Responsibilities</h2>
					<div className="overflow-x-auto">
						<table className="min-w-full bg-white shadow-md rounded-lg">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Name</th>
									<th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Description</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{sortedCategories.map((category) => (
									<tr key={category.id}>
										<td className="px-6 py-4 whitespace-nowrap">{category.name}</td>
										<td
											className="px-6 py-4"
											dangerouslySetInnerHTML={{ __html: formatDescription(category.description) }}
										/>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</div>
	);
}

export default HelpPage;
