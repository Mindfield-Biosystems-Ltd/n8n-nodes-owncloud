import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OwnCloudApi implements ICredentialType {
	name = 'ownCloudApi';
	displayName = 'ownCloud API';
	documentationUrl = 'https://doc.owncloud.com/';
	properties: INodeProperties[] = [
		{
			displayName: 'ownCloud URL',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'https://cloud.example.com',
			required: true,
			description: 'The base URL of your ownCloud instance (without trailing slash)',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			description: 'Your ownCloud username',
		},
		{
			displayName: 'App Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'App password from your ownCloud security settings (recommended for 2FA)',
		},
	];
}
