import { createLogger, format, transports, Logger } from 'winston';
import { CustomLogger } from '@/types';
import { removeLineBreaks } from '@/constants';
import { LOGGING_LEVELS } from '@/lib/logging';

function getLogLevel(): string {
	/*
    LOG_LEVEL can be set in the environment to change the logging level.
    By default, we use the 'info' log level.
    */

	const logLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
	if (process.env.LOG_LEVEL && !LOGGING_LEVELS.includes(logLevel)) {
		serverLogger.warn(`Invalid log level: ${process.env.LOG_LEVEL}. Defaulting to 'info'`);
		return 'info';
	}
	return logLevel;
}

function shouldLog(messageLevel: string, currentLevel: string): boolean {
	/*
    Index of levels[] determines whether current message level is displayed.
    For example, 'debug' is the highest index and includes all other levels.
    */
	const messageLevelIndex = LOGGING_LEVELS.indexOf(messageLevel);
	const currentLevelIndex = LOGGING_LEVELS.indexOf(currentLevel);
	return messageLevelIndex <= currentLevelIndex;
}
/* Unused for now
export const DD_ENABLED = (process.env.DATADOG_API_KEY?.length ?? 0) > 0;
export const DD_SERVICE = 'pops-nextjs';
export const DD_SOURCE = 'nodejs';


const httpTransportOptions = {
	host: 'http-intake.logs.datadoghq.com',
	path: `/api/v2/logs?dd-api-key=${process.env.DATADOG_API_KEY}&ddsource=${DD_SOURCE}&service=${DD_SERVICE}`,
	ssl: true,
};
*/

let serverLogger: Logger | CustomLogger;

if (typeof window === 'undefined') {
	const logLevel = getLogLevel();
	serverLogger = createLogger({
		level: logLevel,
		/* format: DD_ENABLED ? format.json() : format.simple(), */
		format: format.simple(),
		/* transports: DD_ENABLED ? [new transports.Http(httpTransportOptions), new transports.Console()] : [new transports.Console()], */
		transports: [new transports.Console()],
	});
	(serverLogger as Logger).info(`Logging level: [${logLevel}]`);
} else {
	const logLevel = getLogLevel();
	serverLogger = {
		log: (level: string, message: string, meta?: unknown) => {
			const cleanMessage = removeLineBreaks(message);
			switch (level) {
				case 'debug':
					if (shouldLog('debug', logLevel)) serverLogger.debug(cleanMessage, meta);
					break;
				case 'error':
					if (shouldLog('error', logLevel)) serverLogger.error(cleanMessage, meta);
					break;
				case 'warn':
					if (shouldLog('warn', logLevel)) serverLogger.warn(cleanMessage, meta);
					break;
				default:
					if (shouldLog('info', logLevel)) serverLogger.info(cleanMessage, meta);
			}
		},
		info: (message: string, meta?: unknown) => {
			const cleanMessage = removeLineBreaks(message);
			if (shouldLog('info', logLevel)) serverLogger.info(cleanMessage, meta);
		},
		error: (message: string, meta?: unknown) => {
			const cleanMessage = removeLineBreaks(message);
			if (shouldLog('error', logLevel)) serverLogger.error(cleanMessage, meta);
		},
		warn: (message: string, meta?: unknown) => {
			const cleanMessage = removeLineBreaks(message);
			if (shouldLog('warn', logLevel)) serverLogger.warn(cleanMessage, meta);
		},
		debug: (message: string, meta?: unknown) => {
			const cleanMessage = removeLineBreaks(message);
			if (shouldLog('debug', logLevel)) serverLogger.debug(cleanMessage, meta);
		},
	};
}

export default serverLogger;
