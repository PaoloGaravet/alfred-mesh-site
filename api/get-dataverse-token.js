const { app } = require('@azure/functions');
const axios = require('axios');

/**
 * Azure Function per ottenere un token Dataverse per l'utente corrente
 * Usa l'autenticazione di Azure Static Web Apps
 */

app.http('get-dataverse-token', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Richiesta token Dataverse per utente autenticato');

        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        };

        if (request.method === 'OPTIONS') {
            return { status: 200, headers };
        }

        try {
            // In Azure Static Web Apps, l'utente è già autenticato
            // Otteniamo le sue informazioni dall'header
            const clientPrincipal = request.headers.get('x-ms-client-principal');
            
            if (!clientPrincipal) {
                return {
                    status: 401,
                    headers,
                    body: JSON.stringify({
                        error: 'Non autenticato',
                        message: 'Devi essere autenticato per ottenere il token'
                    })
                };
            }

            // Decodifica il client principal
            const principal = JSON.parse(Buffer.from(clientPrincipal, 'base64').toString('utf-8'));
            context.log('Utente:', principal.userDetails);

            // Per ora, restituiamo un messaggio che indica che serve configurazione aggiuntiva
            // In produzione, qui useremmo On-Behalf-Of flow con MSAL
            return {
                status: 200,
                headers,
                body: JSON.stringify({
                    message: 'Token endpoint - configurazione OBO richiesta',
                    user: principal.userDetails,
                    note: 'Implementare On-Behalf-Of flow per ottenere token Dataverse'
                })
            };

        } catch (error) {
            context.error('Errore:', error);
            return {
                status: 500,
                headers,
                body: JSON.stringify({
                    error: 'Errore nel recupero del token',
                    message: error.message
                })
            };
        }
    }
});
