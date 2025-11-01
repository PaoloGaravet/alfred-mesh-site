const { BlobServiceClient } = require('@azure/storage-blob');

/**
 * Azure Function per recuperare la lista eventi da Blob Storage
 * Legge il file _index.json dal container event-photos
 * Endpoint: /api/blob-events
 */

const CONTAINER_NAME = 'event-photos';

/**
 * Recupera la lista eventi dal file _index.json
 */
async function getEventsFromBlob(connectionString) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        
        // Scarica il file _index.json
        const blobClient = containerClient.getBlobClient('_index.json');
        const downloadResponse = await blobClient.download(0);
        
        // Leggi il contenuto
        const chunks = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(chunk);
        }
        const content = Buffer.concat(chunks).toString('utf-8');
        const data = JSON.parse(content);
        
        // Aggiungi il conteggio immagini per ogni evento
        const eventsWithCounts = await Promise.all(
            data.events.map(async (event) => {
                try {
                    let imageCount = 0;
                    const folderPrefix = `${event.folder}/`;
                    
                    for await (const blob of containerClient.listBlobsFlat({ prefix: folderPrefix })) {
                        if (blob.name !== folderPrefix && isImageFile(blob.name)) {
                            imageCount++;
                        }
                    }
                    
                    return {
                        ...event,
                        imageCount
                    };
                } catch (error) {
                    console.error(`Errore conteggio immagini per ${event.id}:`, error);
                    return {
                        ...event,
                        imageCount: 0
                    };
                }
            })
        );
        
        return eventsWithCounts;
        
    } catch (error) {
        console.error('Errore recupero eventi da Blob Storage:', error);
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
    context.log('HTTP trigger function per recupero eventi da Blob Storage');

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

        const events = await getEventsFromBlob(connectionString);

        context.res = {
            status: 200,
            headers,
            body: JSON.stringify(events)
        };

    } catch (error) {
        context.log.error('Errore nel recupero eventi:', error);

        context.res = {
            status: 500,
            headers,
            body: JSON.stringify({
                error: 'Errore nel recupero degli eventi',
                message: error.message
            })
        };
    }
};
