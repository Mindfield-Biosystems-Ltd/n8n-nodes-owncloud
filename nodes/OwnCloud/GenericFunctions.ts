import { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { createClient, WebDAVClient } from 'webdav';

/**
 * Creates a WebDAV client for file operations
 */
export async function getWebDavClient(this: IExecuteFunctions): Promise<WebDAVClient> {
	const credentials = await this.getCredentials('ownCloudApi');
	const host = (credentials.host as string).replace(/\/$/, '');
	const username = credentials.username as string;
	const password = credentials.password as string;

	const webDavUrl = `${host}/remote.php/dav/files/${username}/`;

	return createClient(webDavUrl, {
		username,
		password,
	});
}

/**
 * Executes an OCS API request
 */
export async function ownCloudApiRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('ownCloudApi');
	const host = (credentials.host as string).replace(/\/$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${host}${endpoint}`,
		headers: {
			'Authorization': `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`,
			'OCS-APIRequest': 'true',
			'Accept': 'application/json',
		},
		json: true,
		body,
		qs: {
			...qs,
			format: 'json',
		},
	};

	try {
		const response = await this.helpers.httpRequest(options);
		// OCS API wraps data in ocs.data
		return response.ocs?.data ?? response;
	} catch (error: any) {
		// Enhanced error handling
		if (error.response?.body?.ocs?.meta?.message) {
			throw new Error(`ownCloud API Error: ${error.response.body.ocs.meta.message}`);
		}
		throw error;
	}
}
