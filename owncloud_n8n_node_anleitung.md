# Anleitung: Erstellung eines n8n Community Nodes für ownCloud

Dieses Dokument dient als detaillierte Schritt-für-Schritt-Anleitung zur Erstellung eines n8n Community Nodes für ownCloud. Das Ziel ist es, eine Funktionalität zu implementieren, die der des bestehenden Nextcloud-Nodes ähnelt, um Datei-, Freigabe- und Kalenderoperationen zu ermöglichen.

## 1. Das Fundament: ownCloud vs. Nextcloud API

ownCloud und Nextcloud haben einen gemeinsamen Ursprung, daher sind ihre APIs weitgehend kompatibel:

- **WebDAV**: Kernprotokoll für alle Dateioperationen (Upload, Download, Verschieben, Auflisten, Ordner erstellen etc.)
  - URL: `https://<ihr-owncloud-host>/remote.php/dav/files/<username>/`
- **OCS (Open Collaboration Services) API**: REST-basierte API für Freigaben, Kommentare, Benutzerinformationen
  - URL: `https://<ihr-owncloud-host>/ocs/v2.php/...`
- **CalDAV/CardDAV**: Erweiterungen für Kalender und Kontakte

## 2. Voraussetzungen

Stellen Sie sicher, dass folgende Software installiert ist:

- **Node.js**: Aktuelle LTS-Version (18.x oder 20.x)
- **npm**: Wird mit Node.js installiert
- **VS Code**: Mit Claude Code Extension
- **Git**: Für Versionskontrolle
- **Test-Instanzen**:
  - Eine laufende ownCloud-Instanz
  - Zugang zu ownCloud mit App-Passwort

## 3. Projekt-Setup

### 3.1 Node-Projekt erstellen

```bash
# Neues n8n-Node-Projekt erstellen
npm create @n8n/node@latest n8n-nodes-owncloud

# In das Verzeichnis wechseln
cd n8n-nodes-owncloud

# In VS Code öffnen
code .

# Abhängigkeiten installieren (falls nicht automatisch geschehen)
npm install

# WebDAV-Bibliothek hinzufügen
npm install webdav
```

### 3.2 Entwicklungs-Workflow starten

Der `n8n-node dev` Befehl kompiliert Ihren Code automatisch und startet n8n mit Ihrem Node:

```bash
npm run dev
```

Dieser Befehl:
- Kompiliert Ihren TypeScript-Code bei jeder Änderung
- Startet n8n automatisch mit Ihrem Node
- Ermöglicht Live-Testing ohne manuelles npm link

**Hinweis**: n8n läuft dann auf `http://localhost:5678`

## 4. Credentials-Datei erstellen

### 4.1 Struktur anpassen

Löschen Sie die Beispieldatei `credentials/ExampleApi.credentials.ts` und erstellen Sie:

**credentials/OwnCloudApi.credentials.ts**

```typescript
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
            placeholder: 'https://cloud.meinefirma.de',
            required: true,
            description: 'Die Basis-URL Ihrer ownCloud-Instanz (ohne trailing slash)',
        },
        {
            displayName: 'Username',
            name: 'username',
            type: 'string',
            default: '',
            required: true,
            description: 'Ihr ownCloud-Benutzername',
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
            description: 'App-Passwort aus Ihren ownCloud-Sicherheitseinstellungen (empfohlen bei 2FA)',
        },
    ];
}
```

## 5. Node-Struktur erstellen

### 5.1 Verzeichnisstruktur

```
n8n-nodes-owncloud/
├── credentials/
│   └── OwnCloudApi.credentials.ts
├── nodes/
│   └── OwnCloud/
│       ├── OwnCloud.node.ts
│       ├── FileOperations.ts
│       ├── ShareOperations.ts
│       ├── GenericFunctions.ts
│       └── ownCloud.svg
├── package.json
└── tsconfig.json
```

### 5.2 Generic Functions erstellen

**nodes/OwnCloud/GenericFunctions.ts**

```typescript
import { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { createClient, WebDAVClient } from 'webdav';

/**
 * Erstellt einen WebDAV-Client für Dateioperationen
 */
export function getWebDavClient(this: IExecuteFunctions): WebDAVClient {
    const credentials = this.getCredentials('ownCloudApi') as IDataObject;
    const host = (credentials.host as string).replace(/\/$/, '');
    const username = credentials.username as string;
    const password = credentials.password as string;

    const webDavUrl = \`\${host}/remote.php/dav/files/\${username}/\`;

    return createClient(webDavUrl, {
        username,
        password,
    });
}

/**
 * Führt einen OCS API Request aus
 */
export async function ownCloudApiRequest(
    this: IExecuteFunctions,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: IDataObject,
    qs?: IDataObject,
): Promise<any> {
    const credentials = this.getCredentials('ownCloudApi') as IDataObject;
    const host = (credentials.host as string).replace(/\/$/, '');

    const options: IHttpRequestOptions = {
        method,
        url: \`\${host}\${endpoint}\`,
        headers: {
            'Authorization': \`Basic \${Buffer.from(\`\${credentials.username}:\${credentials.password}\`).toString('base64')}\`,
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
        // OCS API verpackt Daten in ocs.data
        return response.ocs?.data ?? response;
    } catch (error) {
        // Verbesserte Fehlerbehandlung
        if (error.response?.body?.ocs?.meta?.message) {
            throw new Error(\`ownCloud API Error: \${error.response.body.ocs.meta.message}\`);
        }
        throw error;
    }
}
```

### 5.3 File Operations definieren

**nodes/OwnCloud/FileOperations.ts**

```typescript
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
                name: 'Upload',
                value: 'upload',
                description: 'Eine Datei hochladen',
                action: 'Upload a file',
            },
            {
                name: 'Download',
                value: 'download',
                description: 'Eine Datei herunterladen',
                action: 'Download a file',
            },
            {
                name: 'Delete',
                value: 'delete',
                description: 'Eine Datei oder einen Ordner löschen',
                action: 'Delete a file or folder',
            },
            {
                name: 'Create Folder',
                value: 'createFolder',
                description: 'Einen neuen Ordner erstellen',
                action: 'Create a new folder',
            },
            {
                name: 'List',
                value: 'list',
                description: 'Inhalt eines Ordners auflisten',
                action: 'List contents of a folder',
            },
            {
                name: 'Move',
                value: 'move',
                description: 'Eine Datei oder einen Ordner verschieben/umbenennen',
                action: 'Move a file or folder',
            },
            {
                name: 'Copy',
                value: 'copy',
                description: 'Eine Datei oder einen Ordner kopieren',
                action: 'Copy a file or folder',
            },
            {
                name: 'Get Properties',
                value: 'stat',
                description: 'Eigenschaften einer Datei/eines Ordners abrufen',
                action: 'Get properties of a file or folder',
            },
        ],
        default: 'upload',
    },
];

export const fileFields: INodeProperties[] = [
    // Path - wird von fast allen Operationen benötigt
    {
        displayName: 'Path',
        name: 'path',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['upload', 'download', 'delete', 'createFolder', 'list', 'move', 'copy', 'stat'],
            },
        },
        placeholder: '/pfad/zur/datei.txt',
        description: 'Der vollständige Pfad zur Datei oder zum Ordner in ownCloud',
    },
    // Binary Property Name - für Upload
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
        description: 'Name des Feldes im Input-Item, das die Binärdaten enthält',
    },
    // Put Output In Field - für Download
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
        description: 'Name des Feldes für die heruntergeladenen Binärdaten',
    },
    // Destination Path - für Move/Copy
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
        placeholder: '/neuer/pfad/datei.txt',
        description: 'Der Zielpfad für die Operation',
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
```

### 5.4 Share Operations definieren

**nodes/OwnCloud/ShareOperations.ts**

```typescript
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
                description: 'Eine neue Freigabe erstellen',
                action: 'Create a share',
            },
            {
                name: 'Delete',
                value: 'delete',
                description: 'Eine Freigabe löschen',
                action: 'Delete a share',
            },
            {
                name: 'Get',
                value: 'get',
                description: 'Eine Freigabe abrufen',
                action: 'Get a share',
            },
            {
                name: 'Get All',
                value: 'getAll',
                description: 'Alle Freigaben abrufen',
                action: 'Get all shares',
            },
            {
                name: 'Update',
                value: 'update',
                description: 'Eine Freigabe aktualisieren',
                action: 'Update a share',
            },
        ],
        default: 'create',
    },
];

export const shareFields: INodeProperties[] = [
    // Path - für Create und GetAll
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
        placeholder: '/pfad/zur/datei.txt',
        description: 'Der Pfad zur Datei oder zum Ordner',
    },
    // Share ID - für Get, Delete, Update
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
        description: 'Die ID der Freigabe',
    },
    // Share Type - für Create
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
                name: 'Public Link',
                value: 3,
                description: 'Öffentlicher Link',
            },
            {
                name: 'User',
                value: 0,
                description: 'Mit einem Benutzer teilen',
            },
            {
                name: 'Group',
                value: 1,
                description: 'Mit einer Gruppe teilen',
            },
        ],
        default: 3,
        description: 'Die Art der Freigabe',
    },
    // Share With - für User/Group shares
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
        description: 'Benutzername oder Gruppenname',
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
                displayName: 'Password',
                name: 'password',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                description: 'Passwort für die Freigabe',
            },
            {
                displayName: 'Permissions',
                name: 'permissions',
                type: 'options',
                options: [
                    {
                        name: 'Read',
                        value: 1,
                    },
                    {
                        name: 'Update',
                        value: 2,
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
                        name: 'Share',
                        value: 16,
                    },
                    {
                        name: 'All',
                        value: 31,
                    },
                ],
                default: 1,
                description: 'Berechtigungen für die Freigabe',
            },
            {
                displayName: 'Public Upload',
                name: 'publicUpload',
                type: 'boolean',
                default: false,
                description: 'Öffentliches Hochladen erlauben',
            },
            {
                displayName: 'Expiration Date',
                name: 'expireDate',
                type: 'dateTime',
                default: '',
                description: 'Ablaufdatum der Freigabe',
            },
        ],
    },
];
```

### 5.5 Haupt-Node-Datei erstellen

**nodes/OwnCloud/OwnCloud.node.ts**

```typescript
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
        icon: 'file:ownCloud.svg',
        group: ['storage'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Interagiert mit der ownCloud API (WebDAV und OCS)',
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
                        description: 'Operationen mit Dateien und Ordnern',
                    },
                    {
                        name: 'Share',
                        value: 'share',
                        description: 'Operationen mit Freigaben',
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
                    const webDavClient = getWebDavClient.call(this);
                    const path = this.getNodeParameter('path', i) as string;

                    if (operation === 'upload') {
                        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                        const options = this.getNodeParameter('options', i, {}) as { overwrite?: boolean };
                        const item = items[i];

                        if (!item.binary || !item.binary[binaryPropertyName]) {
                            throw new NodeOperationError(
                                this.getNode(),
                                \`Keine Binärdaten im Feld '\${binaryPropertyName}' gefunden.\`,
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
                                    json: item,
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
                            json: stats,
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
                        await ownCloudApiRequest.call(this, 'DELETE', \`\${endpoint}/\${shareId}\`);

                        returnData.push({
                            json: {
                                success: true,
                                shareId,
                            },
                            pairedItem: { item: i },
                        });
                    } else if (operation === 'get') {
                        const shareId = this.getNodeParameter('shareId', i) as string;
                        const response = await ownCloudApiRequest.call(this, 'GET', \`\${endpoint}/\${shareId}\`);

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

                        const response = await ownCloudApiRequest.call(this, 'PUT', \`\${endpoint}/\${shareId}\`, body);

                        returnData.push({
                            json: response,
                            pairedItem: { item: i },
                        });
                    }
                }
            } catch (error) {
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
```

## 6. Package.json anpassen

Stellen Sie sicher, dass Ihre `package.json` korrekt konfiguriert ist:

```json
{
  "name": "n8n-nodes-owncloud",
  "version": "0.1.0",
  "description": "n8n node for ownCloud integration",
  "keywords": [
    "n8n-community-node-package",
    "n8n",
    "owncloud"
  ],
  "license": "MIT",
  "homepage": "",
  "author": {
    "name": "",
    "email": ""
  },
  "repository": {
    "type": "git",
    "url": ""
  },
  "main": "index.js",
  "scripts": {
    "build": "tsc && gulp build:icons",
    "dev": "n8n-node dev",
    "lint": "eslint nodes credentials --ext .ts",
    "lintfix": "eslint nodes credentials --ext .ts --fix",
    "prepublishOnly": "npm run build && npm run lint"
  },
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/OwnCloudApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/OwnCloud/OwnCloud.node.js"
    ]
  },
  "devDependencies": {
    "@types/node": "^18.16.0",
    "n8n-workflow": "latest",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "webdav": "^5.3.0"
  }
}
```

**Wichtig**: Die Pfade in der `n8n` Section zeigen auf `.js` Dateien im `dist` Ordner (kompilierter Code), nicht auf `.ts` Dateien!

## 7. Logo hinzufügen

Laden Sie ein ownCloud SVG-Logo herunter und speichern Sie es als:

```
nodes/OwnCloud/ownCloud.svg
```

## 8. Testing

### 8.1 Lokales Testing

```bash
# Development Mode starten
npm run dev
```

n8n wird automatisch auf `http://localhost:5678` gestartet. Ihr ownCloud-Node sollte in der Node-Liste erscheinen.

### 8.2 Test-Workflow erstellen

1. Fügen Sie den ownCloud-Node hinzu
2. Konfigurieren Sie die Credentials
3. Testen Sie verschiedene Operationen:
   - Ordner erstellen
   - Datei hochladen
   - Datei auflisten
   - Freigabe erstellen

### 8.3 Debugging

Bei Fehlern:
- Überprüfen Sie die Browser-Konsole
- Schauen Sie in die n8n Terminal-Ausgabe
- Nutzen Sie `console.log()` in Ihrem Code

## 9. Tipps für Claude Code in VS Code

### 9.1 Code-Vervollständigung nutzen

Claude Code kann Ihnen helfen:

```typescript
// Schreiben Sie einen Kommentar, was Sie implementieren möchten:
// TODO: Implementiere die calendar operation für CalDAV

// Claude Code wird Vorschläge machen
```

### 9.2 Fehlerbehandlung verbessern

Markieren Sie Code und fragen Sie Claude:
- "Füge besseres Error Handling hinzu"
- "Validiere die Input-Parameter"
- "Füge TypeScript-Typen hinzu"

### 9.3 Tests generieren

```typescript
// Bitten Sie Claude, Unit-Tests zu erstellen:
// "Erstelle Jest-Tests für die upload Operation"
```

## 10. Veröffentlichung

### 10.1 Vorbereitung

```bash
# Code linting
npm run lint

# Build
npm run build

# Package testen
npm pack
```

### 10.2 Auf npm veröffentlichen

```bash
# Bei npm anmelden
npm login

# Veröffentlichen
npm publish --access public
```

### 10.3 In n8n Community registrieren

Nach der Veröffentlichung kann Ihr Node in n8n installiert werden:

```bash
# In n8n-Installation
npm install n8n-nodes-owncloud
```

## 11. Wichtige Hinweise

### 11.1 API-Kompatibilität

- ownCloud und Nextcloud APIs sind weitgehend kompatibel
- Testen Sie gründlich mit Ihrer ownCloud-Version
- Beachten Sie Versionsspezifische Unterschiede

### 11.2 Sicherheit

- Verwenden Sie immer App-Passwörter
- Speichern Sie keine Credentials im Code
- Validieren Sie alle User-Inputs

### 11.3 Performance

- Nutzen Sie Streaming für große Dateien
- Implementieren Sie Pagination für Liste-Operationen
- Cachen Sie WebDAV-Client wo möglich

## 12. Erweiterte Features (Optional)

### 12.1 CalDAV Support

Für Kalender-Funktionalität:

```bash
npm install dav
```

Implementieren Sie CalDAV-Operationen ähnlich wie WebDAV.

### 12.2 Batch-Operationen

Fügen Sie Unterstützung für Batch-Uploads/Downloads hinzu.

### 12.3 Webhooks

Implementieren Sie Trigger-Nodes für ownCloud-Events.

## 13. Troubleshooting

### Problem: Node erscheint nicht in n8n

**Lösung**:
- Prüfen Sie, ob `npm run dev` läuft
- Überprüfen Sie package.json Pfade
- Stellen Sie sicher, dass der Build erfolgreich war

### Problem: Authentication Failed

**Lösung**:
- Verwenden Sie App-Passwörter statt regulärer Passwörter
- Prüfen Sie die ownCloud URL (kein trailing slash)
- Testen Sie Credentials mit curl

### Problem: WebDAV Errors

**Lösung**:
- Überprüfen Sie den WebDAV-Pfad
- Stellen Sie sicher, dass der Benutzer Zugriff hat
- Prüfen Sie ownCloud-Logs

## 14. Ressourcen

- **n8n Dokumentation**: https://docs.n8n.io/integrations/creating-nodes/
- **ownCloud API Docs**: https://doc.owncloud.com/
- **WebDAV Library**: https://github.com/perry-mitchell/webdav-client
- **Nextcloud Node Source**: https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/Nextcloud

## 15. Nächste Schritte

1. ✅ Projekt aufsetzen
2. ✅ Credentials implementieren
3. ✅ File Operations implementieren
4. ✅ Share Operations implementieren
5. ⬜ CalDAV implementieren (optional)
6. ⬜ Ausführlich testen
7. ⬜ Dokumentation schreiben
8. ⬜ Auf npm veröffentlichen

---

**Viel Erfolg bei der Entwicklung Ihres ownCloud n8n Nodes!**
