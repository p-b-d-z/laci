import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { setUncaughtExceptionCaptureCallback } from 'node:process';

const require = createRequire(import.meta.url);

const tsconfig = require('./tsconfig.test.json');

// Handle uncaught TypeScript errors
setUncaughtExceptionCaptureCallback((err) => {
	console.error(err);
	process.exit(1);
});

register('ts-node/esm', pathToFileURL('./'), {
	experimentalSpecifierResolution: 'node',
	transpileOnly: true,
	compilerOptions: {
		...tsconfig.compilerOptions,
		module: 'ESNext',
		moduleResolution: 'node',
	},
});
