const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

/**
 * Azure Function per caricare immagini di eventi su Blob Storage
 * Chiamata dall'agente Copilot Studio quando un utente invia foto
 * Endpoint: /api/upload-event-images
 */

const CONTAINER_NAME = 'event-photos';

/**
 * Carica un'immagine su Blob Storage
 */
async function uploadImageToBlob(connectionString, eventFolder, imageData, fileName) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        
        // Genera un nome file unico se non fornito
        const timestamp = new Date().getTime();
        const finalFileName = fileName || `image_${timestamp}_${uuidv4().substring(0, 8)}.jpg`;
        const blobName = `${eventFolder}/${finalFileName}`;
        
        // Upload dell'immagine
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // Converti da base64 se necessario
        let buffer;
        if (typeof imageData === 'string' && imageData.startsWith('data:')) {
            // Data URL format: data:image/jpeg;base64,/9j/4AAQ...
            const base64Data = imageData.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else if (typeof imageData === 'string') {
            // Assume sia già base64
            buffer = Buffer.from(imageData, 'base64');
        } else {
            buffer = imageData;
        }
        
        // Determina content type dall'estensione
        const contentType = getContentType(finalFileName);
        
        await blockBlobClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: {
                blobContentType: contentType
            }
        });
        
        return {
            success: true,
            fileName: finalFileName,
            blobName: blobName,
            url: blockBlobClient.url
        };
        
    } catch (error) {
        console.error('Errore upload immagine:', error);
        throw error;
    }
}

/**
 * Determina il content type dall'estensione file
 */
function getContentType(fileName) {
    const extension = fileName.toLowerCase().split('.').pop();
    const contentTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'bmp': 'image/bmp'
    };
    return contentTypes[extension] || 'image/jpeg';
}

/**
 * Verifica se l'evento esiste leggendo _index.json
 */
async function eventExists(connectionString, eventId) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        
        const blobClient = containerClient.getBlobClient('_index.json');
        const downloadResponse = await blobClient.download(0);
        
        const chunks = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(chunk);
        }
        const content = Buffer.concat(chunks).toString('utf-8');
        const data = JSON.parse(content);
        
        return data.events.some(event => event.id === eventId || event.folder === eventId);
        
    } catch (error) {
        console.error('Errore verifica evento:', error);
        return false;
    }
}

/**
 * Handler principale dell'Azure Function
 */
module.exports = async function (context, req) {
    context.log('HTTP trigger function per upload immagini eventi');

    // CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

        // Valida parametri richiesti
        const { eventId, images } = req.body;
        
        if (!eventId) {
            context.res = {
                status: 400,
                headers,
                body: JSON.stringify({
                    error: 'Parametro eventId richiesto',
                    message: 'Fornire l\'ID o folder dell\'evento'
                })
            };
            return;
        }
        
        if (!images || !Array.isArray(images) || images.length === 0) {
            context.res = {
                status: 400,
                headers,
                body: JSON.stringify({
                    error: 'Parametro images richiesto',
                    message: 'Fornire un array di immagini da caricare'
                })
            };
            return;
        }

        // Verifica che l'evento esista
        const exists = await eventExists(connectionString, eventId);
        if (!exists) {
            context.res = {
                status: 404,
                headers,
                body: JSON.stringify({
                    error: 'Evento non trovato',
                    message: `L'evento ${eventId} non esiste in _index.json`
                })
            };
            return;
        }

        context.log(`Upload di ${images.length} immagini per evento ${eventId}`);

        // Upload delle immagini
        const uploadResults = [];
        const errors = [];
        
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            try {
                const result = await uploadImageToBlob(
                    connectionString,
                    eventId,
                    image.data || image,
                    image.fileName
                );
                uploadResults.push(result);
                context.log(`✅ Immagine ${i + 1} caricata: ${result.fileName}`);
            } catch (error) {
                const errorMsg = `Errore upload immagine ${i + 1}: ${error.message}`;
                context.log.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        context.res = {
            status: errors.length > 0 && uploadResults.length === 0 ? 500 : 200,
            headers,
            body: JSON.stringify({
                success: uploadResults.length > 0,
                uploaded: uploadResults.length,
                total: images.length,
                results: uploadResults,
                errors: errors.length > 0 ? errors : undefined,
                message: `Caricate ${uploadResults.length} su ${images.length} immagini`
            })
        };

    } catch (error) {
        context.log.error('Errore nell\'upload immagini:', error);

        context.res = {
            status: 500,
            headers,
            body: JSON.stringify({
                error: 'Errore nell\'upload delle immagini',
                message: error.message
            })
        };
    }
};
