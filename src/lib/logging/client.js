async function apiWrapper(url, payload) {
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ payload }),
	});

	if (!response.ok) {
		throw new Error(response.statusText);
	}

	return response.json();
}

const clientLogger = {
	log: async (level = 'info', message, meta = {}) => {
		try {
			const response = await apiWrapper('/api/log', { level, message, meta });
			if (!response.ok) {
				console.error('Failed to send log:', await response.text());
			}
		} catch (error) {
			console.error('Error sending log:', error);
		}
	},
	info: (message, meta = {}) => clientLogger.log('info', message, meta),
	warn: (message, meta = {}) => clientLogger.log('warn', message, meta),
	error: (message, meta = {}) => clientLogger.log('error', message, meta),
	debug: (message, meta = {}) => clientLogger.log('debug', message, meta),
};

export default clientLogger;
