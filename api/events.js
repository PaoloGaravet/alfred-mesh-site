const { app } = require('@azure/functions');
const axios = require('axios');
const { getTokenOnBehalfOf } = require('./azureAuth');

/**
 * Azure Function proxy per Dataverse - usa il token dell'utente autenticato
 * Endpoint: /api/events
 */

// Configurazione Dataverse
const DATAVERSE_ENVIRONMENT_URL = 'https://org4bd35fe5.crm4.dynamics.com';
const DATAVERSE_API_VERSION = '9.2';
const TABLE_NAME = 'cr15b_meshevents';

/**
 * Recupera gli eventi dalla tabella Dataverse usando il token dell'utente
 */
async function getEventsFromDataverse(userToken) {
    try {
        // Query OData per recuperare gli eventi
        const query = `$select=cr15b_mesheventid,cr15b_name,cr15b_date,cr15b_description,cr15b_galleryurl,cr15b_type&$orderby=cr15b_date desc&$filter=statecode eq 0`;
        
        const response = await axios.get(
            `${DATAVERSE_ENVIRONMENT_URL}/api/data/v${DATAVERSE_API_VERSION}/${TABLE_NAME}?${query}`,
            {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Accept': 'application/json',
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Content-Type': 'application/json; charset=utf-8',
                    'Prefer': 'odata.include-annotations="*"'
                }
            }
        );

        // Trasforma i dati Dataverse nel formato atteso dal frontend
        const events = response.data.value.map(event => ({
            id: event.cr15b_mesheventid,
            name: event.cr15b_name,
            date: event.cr15b_date,
            description: event.cr15b_description || '',
            galleryUrl: event.cr15b_galleryurl || '',
            type: event.cr15b_type || 'Evento',
            imageCount: 0 // Verrà calcolato quando si accede alla gallery SharePoint
        }));

        return events;

    } catch (error) {
        console.error('Errore nel recupero eventi da Dataverse:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Handler principale dell'Azure Function
 */
app.http('events', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('HTTP trigger function per recupero eventi con token utente');

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
            // Token emesso da Static Web Apps per il nostro tenant
            const swaAccessToken = request.headers.get('x-ms-token-aad-access-token');

            if (!swaAccessToken) {
                context.warn('Nessun token utente presente nella richiesta. Utente non autenticato?');
                return {
                    status: 401,
                    headers,
                    body: JSON.stringify({
                        error: 'Token mancante',
                        message: 'Effettua il login per accedere agli eventi reali'
                    })
                };
            }

            // Converte il token del front-end in un token Dataverse tramite OBO
            const dataverseToken = await getTokenOnBehalfOf(
                swaAccessToken,
                ['https://org4bd35fe5.crm4.dynamics.com/user_impersonation'],
                context
            );

            const events = await getEventsFromDataverse(dataverseToken);

            return {
                status: 200,
                headers,
                body: JSON.stringify(events)
            };

        } catch (error) {
            context.error('Errore nel recupero eventi:', error);

            const status = error.response?.status || 500;
            const body = {
                error: 'Errore nel recupero degli eventi',
                message: error.message,
                details: error.response?.data
            };

            if (error.errorCode === 'invalid_grant' || String(error.message).includes('AADSTS65001')) {
                body.hint = 'Serve il consenso ai permessi Dataverse per questa applicazione.';
            }

            return {
                status: status === 401 ? 401 : 500,
                headers,
                body: JSON.stringify(body)
            };
        }
    }
});