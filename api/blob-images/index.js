const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');

/**
 * Azure Function per recuperare immagini da Blob Storage
 * Genera URL firmati con SAS token per accesso sicuro
 * Endpoint: /api/blob-images
 */

const CONTAINER_NAME = 'event-photos';
const SAS_EXPIRY_MINUTES = 60; // URL validi per 1 ora

/**
 * Estrae account name e key dalla connection string
 */
function parseConnectionString(connectionString) {
    const parts = connectionString.split(';');
    const accountName = parts.find(p => p.startsWith('AccountName=')).split('=')[1];
    const accountKey = parts.find(p => p.startsWith('AccountKey=')).split('=')[1];
    return { accountName, accountKey };
}

/**
 * Genera un SAS token per un blob
 */
function generateBlobSasUrl(blobClient, accountName, accountKey) {
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    
    const sasOptions = {
        containerName: CONTAINER_NAME,
        blobName: blobClient.name,
        permissions: BlobSASPermissions.parse('r'), // read only
        startsOn: new Date(),
        expiresOn: new Date(Date.now() + SAS_EXPIRY_MINUTES * 60 * 1000)
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    return `${blobClient.url}?${sasToken}`;
}

/**
 * Recupera immagini da Blob Storage per un evento specifico
 */
async function getImagesFromBlob(connectionString, eventFolder) {
    try {
        const { accountName, accountKey } = parseConnectionString(connectionString);
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        
        const images = [];
        const folderPrefix = `${eventFolder}/`;
        
        // Lista tutti i blob nella cartella dell'evento
        for await (const blob of containerClient.listBlobsFlat({ prefix: folderPrefix })) {
            // Salta la cartella stessa e file non-immagine
            if (blob.name === folderPrefix || !isImageFile(blob.name)) {
                continue;
            }
            
            const blobClient = containerClient.getBlobClient(blob.name);
            const sasUrl = generateBlobSasUrl(blobClient, accountName, accountKey);
            
            // Estrai solo il nome del file (senza path)
            const fileName = blob.name.split('/').pop();
            const caption = fileName.replace(/\.[^/.]+$/, ''); // Nome senza estensione
            
            images.push({
                id: blob.name,
                name: fileName,
                url: sasUrl,
                thumbnail: sasUrl, // Per ora usiamo la stessa URL, poi si possono creare thumbnail
                caption: caption,
                size: blob.properties.contentLength,
                lastModified: blob.properties.lastModified
            });
        }
        
        // Ordina per data (più recenti prima)
        images.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        
        return images;
        
    } catch (error) {
        console.error('Errore recupero immagini da Blob Storage:', error);
        throw error;
    }
}

/**
 * Verifica se un file è un'immagine
 */
function isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(extension);
}

/**
 * Handler principale dell'Azure Function (Node.js v3 format)
 */
module.exports = async function (context, req) {
    context.log('HTTP trigger function per recupero immagini da Blob Storage');

    // CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Gestione preflight OPTIONS
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers
        };
        return;
    }

    try {
        const eventFolder = req.query.folder;
        
        if (!eventFolder) {
            context.res = {
                status: 400,
                headers,
                body: JSON.stringify({
                    error: 'Parametro folder richiesto',
                    message: 'Fornire il nome della cartella evento nel parametro ?folder='
                })
            };
            return;
        }
        
        const connectionString = process.env.STORAGE_CONNECTION_STRING;
        
        if (!connectionString) {
            context.log.error('STORAGE_CONNECTION_STRING non configurata');
            context.res = {
                status: 500,
                headers,
                body: JSON.stringify({
                    error: 'Configurazione mancante',
                    message: 'Storage connection string non configurata'
                })
            };
            return;
        }

        context.log('Recupero immagini per evento:', eventFolder);
        
        const images = await getImagesFromBlob(connectionString, eventFolder);

        context.res = {
            status: 200,
            headers,
            body: JSON.stringify(images)
        };

    } catch (error) {
        context.log.error('Errore nel recupero immagini:', error);

        context.res = {
            status: 500,
            headers,
            body: JSON.stringify({
                error: 'Errore nel recupero delle immagini',
                message: error.message
            })
        };
    }
};
