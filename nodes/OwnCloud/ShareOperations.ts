import { INodeProperties } from 'n8n-workflow';

export const shareOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['share'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new share',
				action: 'Create a share',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a share',
				action: 'Delete a share',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a share',
				action: 'Get a share',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many shares',
				action: 'Get many shares',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a share',
				action: 'Update a share',
			},
		],
		default: 'create',
	},
];

export const shareFields: INodeProperties[] = [
	// Path - for Create and GetAll
	{
		displayName: 'Path',
		name: 'path',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['share'],
				operation: ['create', 'getAll'],
			},
		},
		placeholder: '/path/to/file.txt',
		description: 'The path to the file or folder',
	},
	// Share ID - for Get, Delete, Update
	{
		displayName: 'Share ID',
		name: 'shareId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['share'],
				operation: ['get', 'delete', 'update'],
			},
		},
		description: 'The ID of the share',
	},
	// Share Type - for Create
	{
		displayName: 'Share Type',
		name: 'shareType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['share'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Group',
				value: 1,
				description: 'Share with a group',
			},
			{
				name: 'Public Link',
				value: 3,
			},
			{
				name: 'User',
				value: 0,
				description: 'Share with a user',
			},
		],
		default: 3,
		description: 'The type of share',
	},
	// Share With - for User/Group shares
	{
		displayName: 'Share With',
		name: 'shareWith',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['share'],
				operation: ['create'],
				shareType: [0, 1],
			},
		},
		description: 'Username or group name',
	},
	// Additional Options
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['share'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Expiration Date',
				name: 'expireDate',
				type: 'dateTime',
				default: '',
				description: 'Expiration date of the share',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'Password for the share',
			},
			{
				displayName: 'Permissions',
				name: 'permissions',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 31,
					},
					{
						name: 'Create',
						value: 4,
					},
					{
						name: 'Delete',
						value: 8,
					},
					{
						name: 'Read',
						value: 1,
					},
					{
						name: 'Share',
						value: 16,
					},
					{
						name: 'Update',
						value: 2,
					},
				],
				default: 1,
				description: 'Permissions for the share',
			},
			{
				displayName: 'Public Upload',
				name: 'publicUpload',
				type: 'boolean',
				default: false,
				description: 'Whether to allow public upload',
			},
		],
	},
];
