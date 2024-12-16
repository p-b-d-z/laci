import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	cacheDir: 'node_modules/.cache',
	test: {
		environment: 'node',
		include: ['src/**/*.vitest.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
		reporters: ['basic'],
		outputFile: '/dev/null',
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
});
