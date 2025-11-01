const { app } = require('@azure/functions');
const axios = require('axios');
const msal = require('@azure/msal-node');

/**
 * Azure Function per recuperare immagini da SharePoint per un evento specifico
 * Endpoint: /api/events/{eventId}/images
 */

// Configurazione MSAL per autenticazione Microsoft Graph
const msalConfig = {
    auth: {
        clientId: process.env.DATAVERSE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        clientSecret: process.env.DATAVERSE_CLIENT_SECRET,
    }
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

/**
 * Ottiene un access token per Microsoft Graph (SharePoint)
 */
async function getGraphAccessToken() {
    const tokenRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
    };

    try {
        const response = await cca.acquireTokenByClientCredential(tokenRequest);
        return response.accessToken;
    } catch (error) {
        console.error('Errore nell\'ottenimento del token Graph:', error);
        throw error;
    }
}

/**
 * Estrae le informazioni dal GalleryUrl di SharePoint
 */
function parseSharePointUrl(galleryUrl) {
    try {
        // Esempio URL: https://clustermesh.sharepoint.com/sites/events/photos/teambuilding-sept2024
        const url = new URL(galleryUrl);
        const pathParts = url.pathname.split('/').filter(p => p);
        
        // Cerca il pattern /sites/{siteName}
        const siteIndex = pathParts.indexOf('sites');
        const siteName = siteIndex >= 0 ? pathParts[siteIndex + 1] : null;
        
        // Il resto del path è il folder path nella document library
        const folderPath = pathParts.slice(siteIndex + 2).join('/');
        
        return {
            siteUrl: `${url.protocol}//${url.hostname}`,
            siteName,
            folderPath
        };
    } catch (error) {
        console.error('Errore nel parsing dell\'URL SharePoint:', error);
        return null;
    }
}

/**
 * Recupera le immagini da una cartella SharePoint usando Microsoft Graph
 */
async function getImagesFromSharePoint(galleryUrl) {
    try {
        const accessToken = await getGraphAccessToken();
        const urlInfo = parseSharePointUrl(galleryUrl);
        
        if (!urlInfo || !urlInfo.siteName) {
            throw new Error('URL SharePoint non valido');
        }

        // 1. Ottieni il site ID
        const siteResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${urlInfo.siteUrl.replace('https://', '')}:/sites/${urlInfo.siteName}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            }
        );

        const siteId = siteResponse.data.id;

        // 2. Ottieni la default document library (drive)
        const driveResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            }
        );

        const driveId = driveResponse.data.id;

        // 3. Ottieni i file dalla cartella specifica
        const folderPath = urlInfo.folderPath || 'root';
        const filesResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${folderPath}:/children`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            }
        );

        // 4. Filtra solo le immagini e crea l'array di risultati
        const images = filesResponse.data.value
            .filter(file => {
                const ext = file.name.split('.').pop().toLowerCase();
                return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
            })
            .map((file, index) => ({
                id: file.id,
                name: file.name,
                url: file['@microsoft.graph.downloadUrl'],
                thumbnail: file.thumbnails?.[0]?.large?.url || file['@microsoft.graph.downloadUrl'],
                caption: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                date: file.lastModifiedDateTime,
                size: file.size
            }));

        return images;

    } catch (error) {
        console.error('Errore nel recupero immagini da SharePoint:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Handler principale dell'Azure Function
 */
app.http('images', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'events/{eventId}/images',
    handler: async (request, context) => {
        context.log('HTTP trigger function per recupero immagini');

        // Verifica CORS
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        };

        // Gestione preflight OPTIONS
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers
            };
        }

        try {
            // Ottieni il galleryUrl dai query parameters
            const galleryUrl = request.query.get('galleryUrl');
            
            if (!galleryUrl) {
                return {
                    status: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'GalleryUrl mancante',
                        message: 'Il parametro galleryUrl è richiesto'
                    })
                };
            }

            // Recupera immagini da SharePoint
            const images = await getImagesFromSharePoint(galleryUrl);

            return {
                status: 200,
                headers,
                body: JSON.stringify(images)
            };

        } catch (error) {
            context.error('Errore nel recupero immagini:', error);

            return {
                status: 500,
                headers,
                body: JSON.stringify({
                    error: 'Errore nel recupero delle immagini',
                    message: error.message
                })
            };
        }
    }
});