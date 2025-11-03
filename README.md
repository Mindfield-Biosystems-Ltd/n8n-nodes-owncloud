# n8n-nodes-owncloud

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

This is an n8n community node that provides full integration with ownCloud, enabling you to automate file management and sharing operations through WebDAV and OCS APIs.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Features

### File Operations (WebDAV)
- **Upload** - Upload files to ownCloud from n8n workflows
- **Download** - Download files from ownCloud as binary data
- **Delete** - Delete files or folders
- **Create Folder** - Create new directories
- **List** - List contents of folders
- **Move** - Move or rename files and folders
- **Copy** - Copy files and folders
- **Get Properties** - Retrieve metadata about files and folders

### Share Operations (OCS API)
- **Create Share** - Create public links or share with users/groups
- **Delete Share** - Remove existing shares
- **Get Share** - Retrieve information about a specific share
- **Get All Shares** - List all shares for a file or folder
- **Update Share** - Modify share permissions, passwords, and expiration dates

## Installation

### Community Node Installation (Recommended)

1. Go to **Settings > Community Nodes** in your n8n instance
2. Click **Install a community node**
3. Enter `n8n-nodes-owncloud`
4. Click **Install**
5. Restart n8n

### Manual Installation

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-owncloud
```

For Docker installations:
```bash
docker exec -it n8n npm install -g n8n-nodes-owncloud
```

## Compatibility

- **n8n version**: 0.180.0 or above
- **ownCloud version**: 10.x and above (including ownCloud Infinite Scale)
- **Node.js**: 18.10.0 or above

## Credentials

Before using the ownCloud node, you need to set up credentials:

### Creating Credentials

1. In n8n, go to **Credentials** → **New**
2. Search for **ownCloud API**
3. Fill in the following information:
   - **ownCloud URL**: Your ownCloud instance URL (e.g., `https://cloud.example.com`)
   - **Username**: Your ownCloud username
   - **App Password**: Your ownCloud password (see options below)

### Password Options

You have **two options** for authentication:

#### **Option 1: Regular Password** ✅ **WORKS**
- Use your normal ownCloud password (the one for web login and desktop client)
- **Quick and easy for getting started**
- Works perfectly for most use cases

#### **Option 2: App Password** ✅ **RECOMMENDED FOR SECURITY**
For enhanced security, especially if you use 2FA:

1. Log in to your ownCloud instance
2. Click on your **profile picture** (top right) → **Settings**
3. In the left menu, click **Security**
4. Scroll down to **"App passwords"** section
5. Enter a name (e.g., "n8n automation")
6. Click **"Create"** or **"Create new app password"**
7. Copy the generated password
8. Use this app password in n8n credentials (instead of your regular password)

**Benefits of App Passwords:**
- ✅ Required if you have 2FA enabled
- ✅ Can be revoked independently without changing your main password
- ✅ More secure for automated workflows
- ✅ Separate access control for different applications

⚠️ **Important**: App passwords look different from regular passwords (usually longer, auto-generated string). Your regular password will also work, but app passwords are more secure!

## Usage Examples

### Example 1: Automated File Backup

Upload files from external sources to ownCloud:

1. **Trigger**: Schedule (e.g., daily at 2 AM)
2. **HTTP Request**: Download backup file
3. **ownCloud**: Upload operation
   - **Path**: `/backups/backup-{{$now.format('YYYY-MM-DD')}}.zip`
   - **Binary Property**: `data`

### Example 2: Share File and Send Link

Create a public share link and send it via email:

1. **Trigger**: Webhook or manual
2. **ownCloud** (File - Upload): Upload the file
3. **ownCloud** (Share - Create): Create public link
   - **Share Type**: Public Link
   - **Password**: Set optional password
   - **Expiration Date**: Set expiry
4. **Email**: Send link to recipients

### Example 3: Organize Files by Date

Automatically organize uploaded files into date-based folders:

1. **Trigger**: Webhook
2. **ownCloud** (File - Create Folder): Create folder for current month
   - **Path**: `/documents/{{$now.format('YYYY-MM')}}`
3. **ownCloud** (File - Upload): Upload file to the folder
   - **Path**: `/documents/{{$now.format('YYYY-MM')}}/{{$json.filename}}`

### Example 4: Bulk File Operations

Process multiple files in a workflow:

1. **ownCloud** (File - List): Get all files in a folder
2. **Filter**: Filter files by criteria (name, date, size)
3. **ownCloud** (File - Move/Copy/Delete): Perform operations

## Operations Reference

### File Resource

| Operation | Description | Required Fields |
|-----------|-------------|-----------------|
| Upload | Upload a file to ownCloud | Path, Binary Property |
| Download | Download a file from ownCloud | Path, Put Output In Field |
| Delete | Delete a file or folder | Path |
| Create Folder | Create a new directory | Path |
| List | List directory contents | Path |
| Move | Move or rename file/folder | Path, Destination Path |
| Copy | Copy file or folder | Path, Destination Path |
| Get Properties | Get file/folder metadata | Path |

### Share Resource

| Operation | Description | Required Fields |
|-----------|-------------|-----------------|
| Create | Create a new share | Path, Share Type |
| Delete | Remove a share | Share ID |
| Get | Get share information | Share ID |
| Get All | List all shares for path | Path |
| Update | Modify share settings | Share ID |

#### Share Types

- **User (0)**: Share with a specific ownCloud user
- **Group (1)**: Share with an ownCloud group
- **Public Link (3)**: Create a public share link

#### Share Permissions

- **Read (1)**: View only
- **Update (2)**: Edit existing files
- **Create (4)**: Create new files
- **Delete (8)**: Delete files
- **Share (16)**: Re-share with others
- **All (31)**: All permissions

## Troubleshooting

### Connection Issues

**Problem**: "Could not connect to ownCloud"

**Solutions**:
- Verify the ownCloud URL is correct (no trailing slash)
- Check that the instance is accessible from your n8n server
- Ensure credentials are correct
- Test with app password instead of main password

### Authentication Errors

**Problem**: "Authentication failed"

**Solutions**:
- Create a new app password in ownCloud security settings
- Verify username is correct (check case sensitivity)
- Disable 2FA temporarily to test basic auth
- Check ownCloud logs for detailed error messages

### File Upload/Download Issues

**Problem**: Files not uploading or downloading correctly

**Solutions**:
- Verify the path format (should start with `/`)
- Check file size limits in ownCloud and n8n settings
- Ensure proper permissions on ownCloud folders
- Verify binary data is correctly formatted in workflow

### Share Operations Not Working

**Problem**: Cannot create or manage shares

**Solutions**:
- Verify OCS API is enabled in ownCloud
- Check user has sharing permissions
- Ensure share settings allow public links (if using)
- Review ownCloud sharing policies

## Technical Details

### APIs Used

- **WebDAV**: Core protocol for all file operations
  - Endpoint: `{ownCloud-URL}/remote.php/dav/files/{username}/`
- **OCS API**: REST API for sharing and collaboration
  - Endpoint: `{ownCloud-URL}/ocs/v2.php/apps/files_sharing/api/v1/`

### Authentication

Uses HTTP Basic Authentication with app passwords for secure access.

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/Mindfield-Biosystems-Ltd/n8n-nodes-owncloud.git
cd n8n-nodes-owncloud

# Install dependencies
npm install

# Build
npm run build

# Run linting
npm run lint
```

### Testing Locally

```bash
# Start n8n with the node
npm run dev
```

This will compile the TypeScript code and start n8n with your local node loaded.

## Resources

- **n8n Documentation**: https://docs.n8n.io
- **ownCloud Developer Docs**: https://doc.owncloud.com/
- **WebDAV API**: https://doc.owncloud.com/server/developer_manual/webdav_api/
- **OCS Share API**: https://doc.owncloud.com/server/developer_manual/core/apis/ocs-share-api.html

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Mindfield-Biosystems-Ltd/n8n-nodes-owncloud/issues)
- **n8n Community**: https://community.n8n.io

## License

[MIT](LICENSE)

## Credits

Developed by [Niko Rockensüß](mailto:niko.rockensuess@mindfield.de) for [Mindfield Biosystems Ltd](https://www.mindfield.de).

**ownCloud** is a trademark of ownCloud GmbH. This project is not officially affiliated with or endorsed by ownCloud GmbH.

The ownCloud icon used in this project is for identification purposes only and follows fair use guidelines. All rights to the ownCloud trademark and logo belong to ownCloud GmbH.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### Version 1.0.0 (Initial Release)

**Features:**
- Complete WebDAV file operations (upload, download, delete, move, copy, list, create folder, get properties)
- Full OCS share management (create, delete, get, update shares)
- Support for public links, user shares, and group shares
- Share permissions and expiration dates
- Password-protected shares
- Comprehensive error handling
- Binary data support for file uploads and downloads

---

**Made with ❤️ by Mindfield Biosystems Ltd**
