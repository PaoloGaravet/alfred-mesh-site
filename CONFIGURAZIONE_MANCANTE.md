# ⚠️ IMPORTANTE: Configurazione Dataverse Mancante

## Stato Attuale
La gallery mostra **dati di esempio** perché l'accesso a Dataverse richiede configurazione manuale da parte di un amministratore.

## Cosa Serve

### 1. Application User in Dataverse ⭐ PRIORITÀ
**Chi può farlo**: Amministratore Power Platform

1. Vai su https://admin.powerplatform.microsoft.com/
2. **Environments** → Seleziona `4bd35fe5-c3a2-e197-80d7-ff17e2922242`
3. **Settings** → **Users + permissions** → **Application users**
4. Click **+ New app user**
5. **+ Add an app** → Cerca `Alfred Dataverse API`
   - Client ID: `f6137e65-4a31-489b-81ea-64efc69e17d7`
6. **Business unit**: Seleziona il business unit principale
7. **Security roles**: Aggiungi:
   - **Basic User**
   - Un ruolo che ha accesso READ alla tabella `cr15b_meshevent`
8. Click **Create**

### 2. Admin Consent per API Permissions
**Chi può farlo**: Amministratore Azure AD

1. Vai su https://portal.azure.com
2. **Azure Active Directory** → **App registrations**
3. Cerca `Alfred Dataverse API` (Client ID: f6137e65-4a31-489b-81ea-64efc69e17d7)
4. **API permissions** → Verifica che ci sia:
   - `Dynamics CRM` → `user_impersonation` (Delegated)
5. Click **Grant admin consent for [TenantName]**

## Dettagli Tecnici

**Tabella Dataverse:**
- Nome logico: `cr15b_meshevent`
- Nome plurale API: `cr15b_meshevents`
- URL: `https://org4bd35fe5.crm4.dynamics.com/api/data/v9.2/cr15b_meshevents`

**Campi richiesti:**
- `cr15b_mesheventid` (ID primario)
- `cr15b_name` (Nome evento)
- `cr15b_date` (Data evento)
- `cr15b_description` (Descrizione)
- `cr15b_galleryurl` (URL SharePoint della gallery)
- `cr15b_type` (Tipo evento: Team Building, Workshop, Festa, etc.)

## Test
Dopo aver completato la configurazione:
1. Vai su https://proud-pebble-091f8b903.3.azurestaticapps.net/gallery.html
2. Apri Console (F12)
3. Dovresti vedere: "Eventi recuperati da Dataverse: [...]"
4. La gallery mostrerà gli eventi reali invece dei dati di esempio

## Riferimenti
- Environment ID: `4bd35fe5-c3a2-e197-80d7-ff17e2922242`
- Dataverse URL: `https://org4bd35fe5.crm4.dynamics.com`
- Tenant ID: `b00367e2-193a-4f48-94de-7245d45c0947`
- App Registration Site: `abb2c001-903c-46cf-a0df-a77c7abb16ae` (Alfred Mesh Site)
- App Registration API: `f6137e65-4a31-489b-81ea-64efc69e17d7` (Alfred Dataverse API)
