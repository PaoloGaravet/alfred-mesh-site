# Integrazione Gallery con Copilot Studio

## Overview
Questa guida spiega come configurare l'agente Alfred in Copilot Studio per gestire l'upload di immagini nella gallery eventi.

## Azure Function Creata

### Endpoint: `/api/upload-event-images`
**Metodo:** POST  
**Autenticazione:** Anonymous (per permettere chiamate dall'agente)

### Request Body
```json
{
  "eventId": "APE2511-MI",
  "images": [
    {
      "data": "base64_encoded_image_data_or_data_url",
      "fileName": "foto1.jpg"
    }
  ]
}
```

### Response Success (200)
```json
{
  "success": true,
  "uploaded": 3,
  "total": 3,
  "results": [
    {
      "success": true,
      "fileName": "foto1.jpg",
      "blobName": "APE2511-MI/foto1.jpg",
      "url": "https://alfredevents.blob.core.windows.net/event-photos/APE2511-MI/foto1.jpg"
    }
  ],
  "message": "Caricate 3 su 3 immagini"
}
```

## Configurazione Copilot Studio

### 1. Creare un Topic "Pubblica Foto in Gallery"

**Trigger Phrases:**
- "carica foto"
- "pubblica foto"
- "aggiungi foto alla gallery"
- "carica immagini evento"

### 2. Flow del Topic

#### Step 1: Rilevamento Immagini
```
QUANDO l'utente invia un messaggio CON allegati di tipo immagine:
  - Salva le immagini in una variabile: photoAttachments
  - Vai allo Step 2
  
ALTRIMENTI:
  - Chiedi all'utente: "Per favore, invia le foto che vuoi pubblicare nella gallery"
  - Attendi risposta con immagini
```

#### Step 2: Conferma Pubblicazione
```
Messaggio: "Ho ricevuto {numero_foto} foto. Vuoi pubblicarle nella gallery degli eventi?"

Opzioni:
  - ✅ Sì, pubblica
  - ❌ No, annulla
```

#### Step 3: Selezione Evento
```
SE utente conferma:
  - Recupera lista eventi da /api/blob-events
  - Mostra Adaptive Card con lista eventi:
    * APE2511-GE - Aperitivo Cluster Mesh - Genova
    * APE2511-MI - Aperitivo Cluster Mesh - Milano
    * APE2511-TO - Aperitivo Cluster Mesh - Torino
    * MAIN2506-FORTE - S-Mesh on the beach
  - Salva scelta in: selectedEventId
```

#### Step 4: Upload Immagini
```
Chiama Power Automate Flow o HTTP Request:
  - URL: https://proud-pebble-091f8b903.3.azurestaticapps.net/api/upload-event-images
  - Method: POST
  - Headers:
    * Content-Type: application/json
  - Body:
    {
      "eventId": "{selectedEventId}",
      "images": [
        {
          "data": "{base64_image_data}",
          "fileName": "{original_filename}"
        }
      ]
    }
```

#### Step 5: Conferma
```
SE upload ha successo:
  Messaggio: "✅ Perfetto! Ho pubblicato {numero_foto} foto nella gallery dell'evento {nome_evento}. Puoi vederle su https://proud-pebble-091f8b903.3.azurestaticapps.net/gallery.html"

SE upload fallisce:
  Messaggio: "❌ Mi dispiace, c'è stato un errore nel caricare le foto. Riprova più tardi o contatta il supporto."
```

## Power Automate Flow (Alternativa)

Se l'agente non può fare HTTP requests direttamente, crea un Power Automate Flow:

### Trigger
- "When a Power Virtual Agents bot calls a flow"

### Input Parameters
- eventId (String)
- images (Array)

### Actions
1. **For each** image in images:
   - Parse image data
   - Call HTTP request to Azure Function

2. **Return value** to Power Virtual Agents:
   - success (Boolean)
   - message (String)
   - uploadedCount (Number)

## Esempio Adaptive Card per Selezione Evento

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Seleziona l'evento per cui vuoi pubblicare le foto:",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "eventId",
      "style": "expanded",
      "choices": [
        {
          "title": "📸 Aperitivo Cluster Mesh - Genova (13 Nov)",
          "value": "APE2511-GE"
        },
        {
          "title": "📸 Aperitivo Cluster Mesh - Milano (6 Nov)",
          "value": "APE2511-MI"
        },
        {
          "title": "📸 Aperitivo Cluster Mesh - Torino (6 Nov)",
          "value": "APE2511-TO"
        },
        {
          "title": "🏖️ S-Mesh on the beach - Forte dei Marmi (25 Giu)",
          "value": "MAIN2506-FORTE"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Pubblica Foto"
    }
  ]
}
```

## Testing

### Test con cURL
```bash
curl -X POST https://proud-pebble-091f8b903.3.azurestaticapps.net/api/upload-event-images \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "APE2511-MI",
    "images": [
      {
        "data": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
        "fileName": "test.jpg"
      }
    ]
  }'
```

### Test con Postman
1. Method: POST
2. URL: https://proud-pebble-091f8b903.3.azurestaticapps.net/api/upload-event-images
3. Body (raw JSON):
```json
{
  "eventId": "APE2511-MI",
  "images": [
    {
      "data": "base64_encoded_data",
      "fileName": "test.jpg"
    }
  ]
}
```

## Note Importanti

1. **Formato Immagini**: L'API accetta sia:
   - Base64 puro: `"iVBORw0KGgoAAAANSUhEUgAA..."`
   - Data URL: `"data:image/jpeg;base64,/9j/4AAQSkZJRg..."`

2. **Dimensione Massima**: Azure Functions ha un limite di ~100MB per request. Per foto grandi, considera di:
   - Comprimere le immagini lato client
   - Fare upload multipli per batch di foto

3. **Sicurezza**: L'API è anonymous per permettere chiamate dall'agente, ma puoi aggiungere:
   - API Key validation
   - Rate limiting
   - User authentication via Copilot Studio user context

4. **Eventi Validi**: L'API verifica che l'eventId esista in `_index.json` prima dell'upload

## Prossimi Passi

1. ✅ Azure Function creata e deployata
2. ⏳ Configurare topic in Copilot Studio
3. ⏳ Creare Power Automate Flow (se necessario)
4. ⏳ Testare end-to-end con l'agente
5. ⏳ Aggiungere gestione errori e retry logic
