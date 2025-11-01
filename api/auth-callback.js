const { app } = require('@azure/functions');

/**
 * Azure Function per gestire il callback dell'autenticazione
 * Salva il token dell'utente in modo sicuro per uso successivo
 * Endpoint: /api/auth-callback
 */

// Storage temporaneo per i token (in produzione usare Azure Key Vault o Redis)
const tokenStorage = new Map();

/**
 * Estrae e salva il token dell'utente
 */
function saveUserToken(userId, tokenData) {
    // In produzione, salvare in un database sicuro o Azure Key Vault
    tokenStorage.set(userId, {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresOn: tokenData.expiresOn,
        scopes: tokenData.scopes,
        savedAt: new Date().toISOString()
    });
    
    console.log(`Token salvato per utente: ${userId}`);
}

/**
 * Recupera il token salvato dell'utente
 */
function getUserToken(userId) {
    const tokenData = tokenStorage.get(userId);
    
    if (!tokenData) {
        return null;
    }
    
    // Controlla se il token è scaduto (con margine di 5 minuti)
    const expiryTime = new Date(tokenData.expiresOn);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (expiryTime.getTime() - now.getTime() < fiveMinutes) {
        console.log(`Token scaduto per utente: ${userId}`);
        tokenStorage.delete(userId);
        return null;
    }
    
    return tokenData.accessToken;
}

/**
 * Handler principale dell'Azure Function
 */
app.http('auth-callback', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('HTTP trigger function per gestione token utente');

        // Verifica CORS
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID'
        };

        // Gestione preflight OPTIONS
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers
            };
        }

        try {
            const userId = request.headers.get('x-user-id');
            
            if (!userId) {
                return {
                    status: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'User ID richiesto',
                        message: 'Header X-User-ID mancante'
                    })
                };
            }

            if (request.method === 'POST') {
                // Salva il token dell'utente
                const tokenData = await request.json();
                
                if (!tokenData.accessToken) {
                    return {
                        status: 400,
                        headers,
                        body: JSON.stringify({
                            error: 'Token mancante',
                            message: 'accessToken richiesto nel body'
                        })
                    };
                }
                
                saveUserToken(userId, tokenData);
                
                return {
                    status: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Token salvato correttamente'
                    })
                };
                
            } else if (request.method === 'GET') {
                // Recupera il token dell'utente
                const token = getUserToken(userId);
                
                if (!token) {
                    return {
                        status: 404,
                        headers,
                        body: JSON.stringify({
                            error: 'Token non trovato',
                            message: 'Token non disponibile o scaduto'
                        })
                    };
                }
                
                return {
                    status: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        hasToken: true
                    })
                };
            }

        } catch (error) {
            context.error('Errore gestione token:', error);

            return {
                status: 500,
                headers,
                body: JSON.stringify({
                    error: 'Errore interno',
                    message: error.message
                })
            };
        }
    }
});

// Esporta le funzioni per uso da altre Azure Functions
module.exports = {
    getUserToken,
    saveUserToken
};