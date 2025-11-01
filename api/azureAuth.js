const msal = require('@azure/msal-node');

const TENANT_ID = process.env.AZURE_TENANT_ID || 'b00367e2-193a-4f48-94de-7245d45c0947';
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn('⚠️ AZURE_CLIENT_ID o AZURE_CLIENT_SECRET non configurati. L\'acquisizione token fallirà.');
}

const confidentialClient = new msal.ConfidentialClientApplication({
    auth: {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`
    }
});

/**
 * Esegue un On-Behalf-Of flow per ottenere un access token verso la risorsa richiesta.
 * @param {string} userAssertion Access token fornito da Static Web Apps (x-ms-token-aad-access-token)
 * @param {string[]} scopes Scopes richiesti (es. ['https://org.../user_impersonation'])
 * @param {object} context Funzione context per logging
 */
async function getTokenOnBehalfOf(userAssertion, scopes, context) {
    if (!userAssertion) {
        throw new Error('Token utente non disponibile per OBO flow');
    }

    const oboRequest = {
        oboAssertion: userAssertion,
        scopes,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`
    };

    try {
        context && context.log(`Richiesta OBO per scopes: ${scopes.join(', ')}`);
        const result = await confidentialClient.acquireTokenOnBehalfOf(oboRequest);
        context && context.log('Token OBO ottenuto. Scadenza:', result.expiresOn?.toISOString?.() || result.expiresOn);
        return result.accessToken;
    } catch (error) {
        context && context.error('Errore OBO:', error);
        throw error;
    }
}

module.exports = {
    getTokenOnBehalfOf
};