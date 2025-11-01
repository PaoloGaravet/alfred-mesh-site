const { app } = require('@azure/functions');
const axios = require('axios');
const { getTokenOnBehalfOf } = require('./azureAuth');

/**
 * Azure Function per recuperare immagini da SharePoint via Microsoft Graph
 * Usa il token delegato dell'utente (On-Behalf-Of)
 * Endpoint: /api/sharepoint-images
 */

/**
 * Estrae site ID e folder path da URL SharePoint
 */
function parseSharePointUrl(sharePointUrl) {
    try {
        // URL esempio: https://reply.sharepoint.com/:f:/r/sites/ClusterMesh-2025-SmeshontheBeach/Shared%20Documents/2025%20-%20Smesh%20on%20the%20Beach/Foto-Video!?csf=1&web=1&e=tyhYci
        
        const url = new URL(sharePointUrl);
        const hostname = url.hostname; // reply.sharepoint.com
        const pathParts = url.pathname.split('/');
        
        // Cerca il pattern /sites/{site-name}
        const sitesIndex = pathParts.indexOf('sites');
        if (sitesIndex === -1) {
            throw new Error('URL non contiene /sites/');
        }
        
        const siteName = pathParts[sitesIndex + 1];
        
        // Estrai il path della cartella dai parametri
        const searchParams = new URLSearchParams(url.search);
        let folderPath = '';
        
        // Cerca nei frammenti dell'URL per il path della cartella
        if (url.pathname.includes('Shared%20Documents') || url.pathname.includes('Shared Documents')) {
            // Estrai il path dopo "Shared Documents"
            const sharedDocsIndex = url.pathname.indexOf('Shared');
            if (sharedDocsIndex !== -1) {
                folderPath = decodeURIComponent(url.pathname.substring(sharedDocsIndex));
                folderPath = folderPath.replace(/[!?].*$/, ''); // Rimuovi caratteri finali
            }
        }
        
        return {
            hostname,
            siteName,
            folderPath: folderPath || 'Shared Documents'
        };
        
    } catch (error) {
        console.error('Errore parsing URL SharePoint:', error);
        throw new Error('URL SharePoint non valido');
    }
}

/**
 * Recupera immagini da SharePoint usando Microsoft Graph
 */
async function getImagesFromSharePoint(userToken, sharePointUrl) {
    try {
        const { hostname, siteName, folderPath } = parseSharePointUrl(sharePointUrl);
        
        console.log('SharePoint parsing:', { hostname, siteName, folderPath });
        
        // 1. Ottieni site ID tramite Graph API
        const siteResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${hostname}:/sites/${siteName}`,
            {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Accept': 'application/json'
                }
            }
        );
        
        const siteId = siteResponse.data.id;
        console.log('Site ID trovato:', siteId);
        
        // 2. Trova la cartella specifica
        let folderId;
        if (folderPath && folderPath !== 'Shared Documents') {
            // Cerca la cartella specifica
            const folderResponse = await axios.get(
                `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodeURI(folderPath)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Accept': 'application/json'
                    }
                }
            );
            folderId = folderResponse.data.id;
        } else {
            // Usa la root di Shared Documents
            const driveResponse = await axios.get(
                `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root`,
                {
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Accept': 'application/json'
                    }
                }
            );
            folderId = driveResponse.data.id;
        }
        
        console.log('Folder ID trovato:', folderId);
        
        // 3. Recupera tutti i file dalla cartella
        const filesResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${folderId}/children?$filter=file ne null&$expand=thumbnails&$top=100`,
            {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Accept': 'application/json'
                }
            }
        );
        
        // 4. Filtra solo le immagini e crea oggetti per la gallery
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const images = filesResponse.data.value
            .filter(file => {
                const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
                return imageExtensions.includes(extension);
            })
            .map(file => ({
                id: file.id,
                name: file.name,
                url: file['@microsoft.graph.downloadUrl'] || file.webUrl,
                thumbnail: file.thumbnails?.[0]?.large?.url || file.thumbnails?.[0]?.medium?.url || file['@microsoft.graph.downloadUrl'],
                caption: file.name.replace(/\.[^/.]+$/, ''), // Nome senza estensione
                size: file.size,
                lastModified: file.lastModifiedDateTime
            }))
            .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified)); // Più recenti prima
        
        console.log(`Trovate ${images.length} immagini in SharePoint`);
        return images;
        
    } catch (error) {
        console.error('Errore recupero immagini SharePoint:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Handler principale dell'Azure Function
 */
app.http('sharepoint-images', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('HTTP trigger function per recupero immagini SharePoint');

        // Verifica CORS
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        };

        // Gestione preflight OPTIONS
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers
            };
        }

        try {
            // Recupera parametri
            const url = new URL(request.url);
            const sharePointUrl = url.searchParams.get('url');
            
            if (!sharePointUrl) {
                return {
                    status: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Parametro url richiesto',
                        message: 'Fornire l\'URL della cartella SharePoint nel parametro ?url='
                    })
                };
            }
            const swaAccessToken = request.headers.get('x-ms-token-aad-access-token');

            if (!swaAccessToken) {
                context.warn('Nessun token utente presente nella richiesta. Utente non autenticato?');
                return {
                    status: 401,
                    headers,
                    body: JSON.stringify({
                        error: 'Token mancante',
                        message: 'Effettua di nuovo il login per vedere le immagini reali'
                    })
                };
            }

            context.log('Recupero immagini da:', sharePointUrl);

            // OBO per Graph API (SharePoint)
            const graphToken = await getTokenOnBehalfOf(
                swaAccessToken,
                ['https://graph.microsoft.com/Files.Read.All'],
                context
            );

            const images = await getImagesFromSharePoint(graphToken, sharePointUrl);

            return {
                status: 200,
                headers,
                body: JSON.stringify(images)
            };

        } catch (error) {
            context.error('Errore nel recupero immagini SharePoint:', error);

            const status = error.response?.status || 500;
            const body = {
                error: 'Errore nel recupero delle immagini',
                message: error.message,
                details: error.response?.data
            };

            if (String(error.message).includes('AADSTS65001')) {
                body.hint = 'Serve approvazione admin per accedere alle API SharePoint (Files.Read.All).';
            }

            return {
                status,
                headers,
                body: JSON.stringify(body)
            };
        }
    }
});