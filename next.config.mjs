/** @type {import('next').NextConfig} */
const nextConfig = {
	generateBuildId: async () => `${process.env.REGION}-${process.env.ENVIRONMENT}-${process.env.VARIANT}-laci`,
};

export default nextConfig;
