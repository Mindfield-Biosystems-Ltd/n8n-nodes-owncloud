import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { fileOperations, fileFields } from './FileOperations';
import { shareOperations, shareFields } from './ShareOperations';
import { getWebDavClient, ownCloudApiRequest } from './GenericFunctions';

export class OwnCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ownCloud',
		name: 'ownCloud',
		icon: 'file:owncloud.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with ownCloud API (WebDAV and OCS)',
		defaults: {
			name: 'ownCloud',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ownCloudApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'File',
						value: 'file',
						description: 'Operations with files and folders',
					},
					{
						name: 'Share',
						value: 'share',
						description: 'Operations with shares',
					},
				],
				default: 'file',
			},
			...fileOperations,
			...fileFields,
			...shareOperations,
			...shareFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'file') {
					const webDavClient = await getWebDavClient.call(this);
					const path = this.getNodeParameter('path', i) as string;

					if (operation === 'upload') {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const options = this.getNodeParameter('options', i, {}) as { overwrite?: boolean };
						const item = items[i];

						if (!item.binary || !item.binary[binaryPropertyName]) {
							throw new NodeOperationError(
								this.getNode(),
								`No binary data found in field '${binaryPropertyName}'.`,
								{ itemIndex: i }
							);
						}

						const binaryData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						await webDavClient.putFileContents(path, binaryData, {
							overwrite: options.overwrite !== false,
						});

						returnData.push({
							json: {
								success: true,
								path,
							},
							pairedItem: { item: i },
						});
					} else if (operation === 'download') {
						const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
						const fileContent = await webDavClient.getFileContents(path);

						const fileName = path.split('/').pop() || 'file';
						const binaryData = await this.helpers.prepareBinaryData(
							fileContent as Buffer,
							fileName
						);

						returnData.push({
							json: {},
							binary: {
								[binaryProperty]: binaryData,
							},
							pairedItem: { item: i },
						});
					} else if (operation === 'delete') {
						await webDavClient.deleteFile(path);

						returnData.push({
							json: {
								success: true,
								path,
							},
							pairedItem: { item: i },
						});
					} else if (operation === 'createFolder') {
						await webDavClient.createDirectory(path);

						returnData.push({
							json: {
								success: true,
								path,
							},
							pairedItem: { item: i },
						});
					} else if (operation === 'list') {
						const contents = await webDavClient.getDirectoryContents(path);

						if (Array.isArray(contents)) {
							contents.forEach((item) => {
								returnData.push({
									json: item as any,
									pairedItem: { item: i },
								});
							});
						}
					} else if (operation === 'move') {
						const destinationPath = this.getNodeParameter('destinationPath', i) as string;
						await webDavClient.moveFile(path, destinationPath);

						returnData.push({
							json: {
								success: true,
								from: path,
								to: destinationPath,
							},
							pairedItem: { item: i },
						});
					} else if (operation === 'copy') {
						const destinationPath = this.getNodeParameter('destinationPath', i) as string;
						await webDavClient.copyFile(path, destinationPath);

						returnData.push({
							json: {
								success: true,
								from: path,
								to: destinationPath,
							},
							pairedItem: { item: i },
						});
					} else if (operation === 'stat') {
						const stats = await webDavClient.stat(path);

						returnData.push({
							json: stats as any,
							pairedItem: { item: i },
						});
					}
				} else if (resource === 'share') {
					const endpoint = '/ocs/v2.php/apps/files_sharing/api/v1/shares';

					if (operation === 'create') {
						const path = this.getNodeParameter('path', i) as string;
						const shareType = this.getNodeParameter('shareType', i) as number;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

						const body: any = {
							path,
							shareType,
						};

						if (shareType === 0 || shareType === 1) {
							body.shareWith = this.getNodeParameter('shareWith', i);
						}

						if (additionalFields.password) {
							body.password = additionalFields.password;
						}
						if (additionalFields.permissions) {
							body.permissions = additionalFields.permissions;
						}
						if (additionalFields.publicUpload) {
							body.publicUpload = additionalFields.publicUpload;
						}
						if (additionalFields.expireDate) {
							body.expireDate = additionalFields.expireDate;
						}

						const response = await ownCloudApiRequest.call(this, 'POST', endpoint, body);

						returnData.push({
							json: response,
							pairedItem: { item: i },
						});
					} else if (operation === 'delete') {
						const shareId = this.getNodeParameter('shareId', i) as string;
						await ownCloudApiRequest.call(this, 'DELETE', `${endpoint}/${shareId}`);

						returnData.push({
							json: {
								success: true,
								shareId,
							},
							pairedItem: { item: i },
						});
					} else if (operation === 'get') {
						const shareId = this.getNodeParameter('shareId', i) as string;
						const response = await ownCloudApiRequest.call(this, 'GET', `${endpoint}/${shareId}`);

						returnData.push({
							json: response,
							pairedItem: { item: i },
						});
					} else if (operation === 'getAll') {
						const path = this.getNodeParameter('path', i) as string;
						const response = await ownCloudApiRequest.call(this, 'GET', endpoint, undefined, { path });

						if (Array.isArray(response)) {
							response.forEach((share) => {
								returnData.push({
									json: share,
									pairedItem: { item: i },
								});
							});
						} else {
							returnData.push({
								json: response,
								pairedItem: { item: i },
							});
						}
					} else if (operation === 'update') {
						const shareId = this.getNodeParameter('shareId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

						const body: any = {};

						if (additionalFields.password !== undefined) {
							body.password = additionalFields.password;
						}
						if (additionalFields.permissions !== undefined) {
							body.permissions = additionalFields.permissions;
						}
						if (additionalFields.publicUpload !== undefined) {
							body.publicUpload = additionalFields.publicUpload;
						}
						if (additionalFields.expireDate !== undefined) {
							body.expireDate = additionalFields.expireDate;
						}

						const response = await ownCloudApiRequest.call(this, 'PUT', `${endpoint}/${shareId}`, body);

						returnData.push({
							json: response,
							pairedItem: { item: i },
						});
					}
				}
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
