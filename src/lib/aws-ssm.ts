/*
This file contains functions for interacting with AWS SSM Parameter Store.

This library will perform the following operations:
- Read a single parameter from SSM i.e, /<environment>/laci/applications/<applicationGuid>/enabled
- Read an entire path of parameters from SSM i.e., /<environment>/laci/applications/<applicationGuid>
- Write a single parameter to SSM
- Write an entire path of parameters to SSM 
- Delete a single parameter from SSM
- Delete an entire path of parameters from SSM
*/

/*
This module is now deprecated due to limits being reached too easily:
  error: Error creating/updating LACI entry: You have reached the maximum number of standard parameters for this AWS account and Region (10000).
  To add more parameters, either delete existing parameters or upgrade to the advanced-parameter tier (charges apply).
*/

import { REGION } from '@/constants';
import {
	SSMClient,
	GetParameterCommand,
	PutParameterCommand,
	GetParametersByPathCommand,
	DeleteParameterCommand,
	DeleteParametersCommand,
} from '@aws-sdk/client-ssm';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { SSMValue } from '@/types';
import serverLogger from '@/lib/logging/server';

const AWSCredProvider = fromNodeProviderChain({
	clientConfig: {
		region: REGION,
	},
});
const ssmClient = new SSMClient({ region: REGION, credentials: AWSCredProvider });

const MAX_RETRIES = 5;
const BASE_DELAY = 100;

async function retryOperation<T>(operation: () => Promise<T>): Promise<T> {
	let retries = 0;
	while (true) {
		try {
			return await operation();
		} catch (error) {
			if (retries >= MAX_RETRIES || !isRetryableError(error)) {
				serverLogger.error('Operation failed after retries:', error);
				throw error;
			}
			const delay = Math.min(BASE_DELAY * Math.pow(2, retries), 5000); // Max delay of 5 seconds
			await new Promise((resolve) => setTimeout(resolve, delay));
			retries++;
		}
	}
}

function isRetryableError(error: unknown): boolean {
	return (
		error instanceof Error &&
		(error.name === 'TooManyUpdatesException' || error.name === 'ThrottlingException' || error.name === 'TooManyUpdates')
	);
}

export async function getParameter(parameterName: string): Promise<SSMValue | null> {
	return retryOperation(async () => {
		try {
			const command = new GetParameterCommand({ Name: parameterName });
			const response = await ssmClient.send(command);
			return response.Parameter?.Value ?? null;
		} catch (error) {
			if (error instanceof Error && error.name === 'ParameterNotFound') {
				return null;
			}
			throw error;
		}
	});
}

export async function putParameter(parameterName: string, value: SSMValue): Promise<void> {
	return retryOperation(async () => {
		const command = new PutParameterCommand({
			Name: parameterName,
			Value: value,
			Type: 'String',
			Overwrite: true,
		});
		await ssmClient.send(command);
	});
}

export async function getParametersByPath(path: string, recursive: boolean = true): Promise<Record<string, SSMValue>> {
	return retryOperation(async () => {
		const parameters: Record<string, SSMValue> = {};
		let nextToken: string | undefined;

		do {
			const command = new GetParametersByPathCommand({
				Path: path,
				Recursive: recursive,
				NextToken: nextToken,
			});
			const response = await ssmClient.send(command);

			response.Parameters?.forEach((param) => {
				if (param.Name && param.Value) {
					try {
						parameters[param.Name] = JSON.parse(param.Value);
					} catch {
						parameters[param.Name] = param.Value;
					}
				}
			});

			nextToken = response.NextToken;
		} while (nextToken);

		return parameters;
	});
}

export async function putParametersByPath(path: string, values: Record<string, SSMValue>): Promise<void> {
	serverLogger.info(`[SSM] Updating ${path}`);
	for (const [key, value] of Object.entries(values)) {
		if (value === '') {
			serverLogger.warn(`Skipping empty value for key: ${key}`);
			continue;
		}
		let stringValue: string;
		if (typeof value === 'object') {
			stringValue = JSON.stringify(value);
		} else {
			stringValue = value;
		}
		serverLogger.debug(`[SSM] New value: ${stringValue}`);
		await putParameter(`${path}/${key}`, stringValue);
	}
}

export async function deleteParameter(parameterName: string): Promise<boolean> {
	return retryOperation(async () => {
		try {
			const command = new DeleteParameterCommand({ Name: parameterName });
			await ssmClient.send(command);
			return true;
		} catch (error) {
			if (error instanceof Error && error.name === 'ParameterNotFound') {
				return false;
			}
			throw error;
		}
	});
}

export async function deleteParametersByPath(path: string): Promise<boolean> {
	return retryOperation(async () => {
		try {
			const params = await getParametersByPath(path);
			const names = Object.keys(params);

			if (names.length === 0) {
				serverLogger.warn(`No parameters found at path: ${path}`);
				return true;
			}

			// Delete parameters in batches of 10 (AWS SSM limit)
			for (let i = 0; i < names.length; i += 10) {
				const batch = names.slice(i, i + 10);
				const command = new DeleteParametersCommand({ Names: batch });
				await ssmClient.send(command);
			}

			serverLogger.info(`Successfully deleted ${names.length} parameters at path: ${path}`);
			return true;
		} catch (error) {
			serverLogger.error(`Error deleting parameters at path ${path}:`, error);
			return false;
		}
	});
}
