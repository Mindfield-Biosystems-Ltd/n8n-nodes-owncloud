# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-03

### Added
- Initial release of n8n-nodes-owncloud
- WebDAV file operations:
  - Upload files with binary data support
  - Download files to binary properties
  - Delete files and folders
  - Create folders/directories
  - List directory contents
  - Move files and folders
  - Copy files and folders
  - Get file/folder properties (stat)
- OCS API share operations:
  - Create shares (public links, user shares, group shares)
  - Delete shares
  - Get individual share information
  - Get all shares for a path
  - Update share settings (permissions, password, expiration)
- Share features:
  - Public link generation
  - Password protection
  - Expiration dates
  - Granular permissions (Read, Update, Create, Delete, Share, All)
  - User and group sharing
- Authentication via app passwords
- Comprehensive error handling
- Full TypeScript implementation
- Complete documentation and examples

### Security
- Support for app-specific passwords
- Secure credential storage via n8n credentials system
- Basic Authentication over HTTPS

[1.0.0]: https://github.com/Mindfield-Biosystems-Ltd/n8n-nodes-owncloud/releases/tag/v1.0.0
