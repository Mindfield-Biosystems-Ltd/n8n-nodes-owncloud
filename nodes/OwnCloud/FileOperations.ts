import { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Copy',
				value: 'copy',
				description: 'Copy a file or folder',
				action: 'Copy a file or folder',
			},
			{
				name: 'Create Folder',
				value: 'createFolder',
				description: 'Create a new folder',
				action: 'Create a new folder',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file or folder',
				action: 'Delete a file or folder',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
				action: 'Download a file',
			},
			{
				name: 'Get Properties',
				value: 'stat',
				description: 'Get properties of a file or folder',
				action: 'Get properties of a file or folder',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List contents of a folder',
				action: 'List contents of a folder',
			},
			{
				name: 'Move',
				value: 'move',
				description: 'Move or rename a file or folder',
				action: 'Move a file or folder',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search for files and folders',
				action: 'Search for files and folders',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file',
				action: 'Upload a file',
			},
		],
		default: 'upload',
	},
];

export const fileFields: INodeProperties[] = [
	// Path - required for most operations (with resource locator for browsing)
	{
		displayName: 'Path',
		name: 'path',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload', 'download', 'delete', 'list', 'move', 'copy', 'stat'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a file or folder...',
				typeOptions: {
					searchListMethod: 'searchFiles',
					searchable: true,
				},
			},
			{
				displayName: 'By Path',
				name: 'path',
				type: 'string',
				placeholder: '/path/to/file.txt',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^/.*',
							errorMessage: 'Path must start with /',
						},
					},
				],
			},
		],
		description: 'The file or folder to operate on',
	},
	// Simple path for createFolder (no need for resource locator)
	{
		displayName: 'Folder Path',
		name: 'path',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['createFolder'],
			},
		},
		placeholder: '/path/to/newfolder',
		description: 'The full path for the new folder',
	},
	// Search Query - for Search operation
	{
		displayName: 'Search Query',
		name: 'searchQuery',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['search'],
			},
		},
		placeholder: 'filename',
		description: 'Search for files and folders by name (case-insensitive)',
	},
	{
		displayName: 'Search Path',
		name: 'searchPath',
		type: 'string',
		default: '/',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['search'],
			},
		},
		placeholder: '/folder/to/search',
		description: 'The folder to search in (default: root)',
	},
	// Binary Property Name - for Upload
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		description: 'Name of the field in the input item that contains the binary data',
	},
	// Put Output In Field - for Download
	{
		displayName: 'Put Output In Field',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
			},
		},
		description: 'Name of the field for the downloaded binary data',
	},
	// Destination Path - for Move/Copy
	{
		displayName: 'Destination Path',
		name: 'destinationPath',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['move', 'copy'],
			},
		},
		placeholder: '/new/path/file.txt',
		description: 'The destination path for the operation',
	},
	// Options
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				displayName: 'Overwrite',
				name: 'overwrite',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						'/operation': ['upload'],
					},
				},
				description: 'Whether to overwrite an existing file',
			},
		],
	},
];
