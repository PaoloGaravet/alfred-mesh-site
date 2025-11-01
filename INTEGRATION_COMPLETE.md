# 🎉 Integrazione Dataverse Completata!

## ✅ Configurazione Completata

### 🔐 **App Registration Creata**
- **Nome**: Alfred Dataverse API
- **Client ID**: `f6137e65-4a31-489b-81ea-64efc69e17d7`
- **Tenant ID**: `b00367e2-193a-4f48-94de-7245d45c0947`
- **Client Secret**: Configurato ✅

### 🚀 **Azure Functions Deployate**
- ✅ `/api/events` - Recupera eventi da Dataverse
- ✅ `/api/events/{eventId}/images` - Recupera immagini da SharePoint
- ✅ Autenticazione configurata
- ✅ CORS configurato

### ⚙️ **Configurazione Static Web App**
- ✅ Credenziali Dataverse configurate
- ✅ API integrate nel deploy
- ✅ Route protette con autenticazione

## 📋 **Prossimi Step Necessari**

### 1. Configura Permessi API in Azure AD

```bash
# Vai al portale Azure
# Azure Active Directory → App registrations → "Alfred Dataverse API"
```

**API Permissions da aggiungere**:
1. **Dynamics CRM** (o Common Data Service)
   - `user_impersonation` (Delegated)
   
2. **Microsoft Graph**
   - `Sites.Read.All` (Application)
   - `Files.Read.All` (Application)

**Grant Admin Consent** dopo aver aggiunto i permessi!

### 2. Aggiungi l'App come Application User in Dataverse

1. Vai su **Power Platform Admin Center**: https://admin.powerplatform.microsoft.com
2. Seleziona l'environment con ID: `4bd35fe5-c3a2-e197-80d7-ff17e2922242`
3. **Settings** → **Users + permissions** → **Application users**
4. **+ New app user**
5. **+ Add an app** → Cerca "Alfred Dataverse API"
6. **Business unit**: Seleziona la root business unit
7. **Security roles**: Assegna **System Administrator** o un custom role con accesso a `cr15b_MeshEvent`
8. **Create**

### 3. Verifica la Tabella Dataverse

Assicurati che la tabella `cr15b_MeshEvent` abbia i seguenti campi:

| Campo Logico | Campo Nome | Tipo | Descrizione |
|--------------|------------|------|-------------|
| `cr15b_mesheventid` | ID Evento | Primary Key | GUID univoco |
| `cr15b_name` | Nome Evento | Single Line Text | Nome dell'evento |
| `cr15b_date` | Data Evento | Date Only | Data dell'evento |
| `cr15b_description` | Descrizione | Multiple Lines Text | Descrizione dettagliata |
| `cr15b_galleryurl` | Gallery URL | Single Line Text | URL SharePoint della gallery |
| `cr15b_type` | Tipo Evento | Choice/Text | Tipo (Team Building, Workshop, etc.) |
| `statecode` | Status | Status | 0=Active, 1=Inactive |

### 4. Configura SharePoint Permissions

Per accedere alle immagini in SharePoint, l'app ha bisogno di:

1. **Microsoft Graph API permissions** (già menzionato sopra)
2. **Grant admin consent** per `Sites.Read.All` e `Files.Read.All`

### 5. Test dell'Integrazione

Una volta completati gli step sopra:

```bash
# Test API Eventi (da browser autenticato)
https://proud-pebble-091f8b903.3.azurestaticapps.net/api/events

# Test API Immagini
https://proud-pebble-091f8b903.3.azurestaticapps.net/api/events/123/images?galleryUrl=<url-sharepoint>
```

## 📊 **Struttura Eventi in Dataverse**

### Esempio Record:

```json
{
  "cr15b_mesheventid": "guid-123-456",
  "cr15b_name": "Team Building Autunno 2024",
  "cr15b_date": "2024-10-15",
  "cr15b_description": "Giornata di team building presso il lago con attività outdoor",
  "cr15b_galleryurl": "https://clustermesh.sharepoint.com/sites/events/Shared Documents/TeamBuilding2024",
  "cr15b_type": "Team Building",
  "statecode": 0
}
```

## 🔍 **Debug & Troubleshooting**

### Controllare i Log delle Azure Functions

```bash
# Visualizza i log in tempo reale
az staticwebapp functions list-logs --name "alfred-mesh-site" --resource-group "Alfred-Mesh"
```

### Errori Comuni:

1. **401 Unauthorized da Dataverse**
   - ✅ Verifica che l'Application User sia stato creato
   - ✅ Controlla i security roles assegnati
   - ✅ Verifica che i permessi API siano stati granted

2. **403 Forbidden da SharePoint**
   - ✅ Verifica i permessi Graph API
   - ✅ Grant admin consent per Sites.Read.All

3. **Empty response o timeout**
   - ✅ Verifica che la tabella `cr15b_meshevents` esista (plurale!)
   - ✅ Controlla che ci siano record attivi (statecode=0)

## 🎯 **URL Finali**

- **Sito principale**: https://proud-pebble-091f8b903.3.azurestaticapps.net
- **Gallery eventi**: https://proud-pebble-091f8b903.3.azurestaticapps.net/gallery.html
- **API eventi**: https://proud-pebble-091f8b903.3.azurestaticapps.net/api/events
- **API immagini**: https://proud-pebble-091f8b903.3.azurestaticapps.net/api/events/{id}/images

## 📚 **Documentazione di Riferimento**

- [Dataverse Web API](https://docs.microsoft.com/power-apps/developer/data-platform/webapi/overview)
- [Microsoft Graph SharePoint API](https://docs.microsoft.com/graph/api/resources/sharepoint)
- [Azure Static Web Apps API](https://docs.microsoft.com/azure/static-web-apps/apis)
- [MSAL Node](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)

---

**Una volta completati i 5 step sopra, la gallery sarà completamente funzionante con i dati reali da Dataverse e le immagini da SharePoint!** 🎊