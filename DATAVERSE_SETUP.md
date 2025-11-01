# Setup Azure Functions per Alfred Gallery

## 📋 Prerequisiti

- Azure CLI installato
- Node.js 18+ installato
- Azure Functions Core Tools v4
- Accesso alla subscription Azure

## 🔧 Setup Locale

### 1. Installa dipendenze

```bash
cd api
npm install
```

### 2. Configura variabili d'ambiente

Copia il template e compila con i valori reali:

```bash
cp local.settings.json.template local.settings.json
```

Modifica `local.settings.json` con:
- **DATAVERSE_CLIENT_ID**: Client ID dell'App Registration Azure AD
- **DATAVERSE_CLIENT_SECRET**: Client Secret generato
- **AZURE_TENANT_ID**: Tenant ID Reply (già configurato)

### 3. Testa localmente

```bash
npm start
```

Le funzioni saranno disponibili su:
- http://localhost:7071/api/events
- http://localhost:7071/api/events/{eventId}/images

## 🚀 Deploy su Azure

### Opzione 1: Deploy tramite Static Web Apps (Integrato)

Le Azure Functions vengono deployate automaticamente con Static Web Apps se la cartella `api` è presente nella root del progetto.

### Opzione 2: Deploy manuale

```bash
# Login ad Azure
az login

# Deploy delle funzioni
cd api
func azure functionapp publish <nome-function-app>
```

## 🔐 Configurazione App Registration per Dataverse

### 1. Crea App Registration per Dataverse

```bash
# Crea app registration
az ad app create --display-name "Alfred Dataverse API" \
  --sign-in-audience "AzureADMyOrg"

# Salva l'Application (client) ID che viene restituito
```

### 2. Configura permessi Dataverse

Nel portale Azure:

1. Vai su **Azure Active Directory** → **App registrations** → "Alfred Dataverse API"
2. **API permissions** → **Add a permission**
3. Cerca "Dynamics CRM" o "Common Data Service"
4. Seleziona **Delegated permissions**:
   - `user_impersonation`
5. Clicca **Grant admin consent**

### 3. Crea Client Secret

```bash
# Crea client secret
az ad app credential reset --id <application-id> --display-name "API Secret"

# Salva il secret value restituito (apparirà solo una volta)
```

### 4. Aggiungi l'app come Application User in Dataverse

1. Vai su **Power Platform Admin Center**
2. Seleziona l'environment: **4bd35fe5-c3a2-e197-80d7-ff17e2922242**
3. **Settings** → **Users + permissions** → **Application users**
4. **New app user** → Seleziona l'app "Alfred Dataverse API"
5. Assegna il security role appropriato (es. System Administrator o custom role)

## 🔧 Configurazione Environment Variables su Azure

### Tramite Azure CLI

```bash
# Configura le variabili per Static Web App
az staticwebapp appsettings set \
  --name "alfred-mesh-site" \
  --resource-group "Alfred-Mesh" \
  --setting-names \
    "DATAVERSE_CLIENT_ID=<your-client-id>" \
    "DATAVERSE_CLIENT_SECRET=<your-client-secret>" \
    "AZURE_TENANT_ID=b00367e2-193a-4f48-94de-7245d45c0947"
```

### Tramite Portale Azure

1. Vai alla **Static Web App** "alfred-mesh-site"
2. **Configuration** → **Application settings**
3. Aggiungi le variabili:
   - `DATAVERSE_CLIENT_ID`
   - `DATAVERSE_CLIENT_SECRET`
   - `AZURE_TENANT_ID`

## 📊 Struttura Tabella Dataverse

La tabella `cr15b_MeshEvent` deve avere i seguenti campi:

- **cr15b_mesheventid** (Primary Key): GUID dell'evento
- **cr15b_name** (Text): Nome dell'evento
- **cr15b_date** (Date): Data dell'evento
- **cr15b_description** (Text/Memo): Descrizione dell'evento
- **cr15b_galleryurl** (Text): URL della gallery SharePoint
- **cr15b_type** (Choice/Text): Tipo di evento (Team Building, Workshop, etc.)
- **statecode** (Status): 0=Active, 1=Inactive

## 🧪 Test delle API

### Test Eventi

```bash
curl http://localhost:7071/api/events
```

Oppure in produzione:
```bash
curl https://proud-pebble-091f8b903.3.azurestaticapps.net/api/events
```

### Test Immagini

```bash
curl "http://localhost:7071/api/events/123/images?galleryUrl=https://clustermesh.sharepoint.com/sites/events/photos/event1"
```

## 📝 Note Importanti

1. **Sicurezza**: Le Azure Functions usano `authLevel: 'anonymous'` perché la sicurezza è gestita dallo Static Web App a monte
2. **CORS**: Già configurato per permettere richieste dal dominio dello Static Web App
3. **Caching**: Considera di aggiungere caching per ridurre le chiamate a Dataverse/SharePoint
4. **Rate Limiting**: Dataverse ha limiti API, monitora l'utilizzo

## 🐛 Troubleshooting

### Errore di autenticazione Dataverse
- Verifica che l'App Registration sia aggiunta come Application User
- Controlla che i permessi siano stati granted
- Verifica i security roles assegnati

### Errore 403 SharePoint
- Verifica che l'app abbia permessi `Sites.Read.All` in Microsoft Graph
- Grant admin consent per i permessi Graph

### Immagini non visibili
- Verifica che il `galleryUrl` nel Dataverse sia corretto
- Controlla che la cartella SharePoint esista e contenga immagini
- Verifica i permessi di accesso alla SharePoint site