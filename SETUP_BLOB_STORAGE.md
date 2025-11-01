# Configurazione Blob Storage per Gallery Eventi

## Passi da completare

### 1. Creare Azure Storage Account

```bash
# Crea resource group (se non esiste già)
az group create --name alfred-resources --location westeurope

# Crea storage account
az storage account create \
  --name alfredevents \
  --resource-group alfred-resources \
  --location westeurope \
  --sku Standard_LRS \
  --kind StorageV2
```

### 2. Creare Container

```bash
# Crea container per le foto eventi
az storage container create \
  --name event-photos \
  --account-name alfredevents \
  --auth-mode login
```

### 3. Caricare il file _index.json

```bash
# Upload del file _index.json nella root del container
az storage blob upload \
  --account-name alfredevents \
  --container-name event-photos \
  --name _index.json \
  --file _index.json \
  --auth-mode login
```

### 4. Caricare le foto degli eventi

```bash
# Per ogni evento, crea una cartella e carica le foto
# Esempio per APE2511-GE:
az storage blob upload-batch \
  --account-name alfredevents \
  --destination event-photos/APE2511-GE \
  --source ./local-path-to-ge-photos \
  --auth-mode login

# Ripeti per APE2511-MI:
az storage blob upload-batch \
  --account-name alfredevents \
  --destination event-photos/APE2511-MI \
  --source ./local-path-to-mi-photos \
  --auth-mode login

# Ripeti per APE2511-TO:
az storage blob upload-batch \
  --account-name alfredevents \
  --destination event-photos/APE2511-TO \
  --source ./local-path-to-to-photos \
  --auth-mode login
```

### 5. Ottenere Connection String

```bash
# Recupera la connection string
az storage account show-connection-string \
  --name alfredevents \
  --resource-group alfred-resources \
  --output tsv
```

### 6. Configurare Static Web App

Nel portale Azure:
1. Vai su **Static Web Apps** → **proud-pebble-091f8b903**
2. **Configuration** → **Application settings**
3. Aggiungi nuova setting:
   - Name: `STORAGE_CONNECTION_STRING`
   - Value: [la connection string ottenuta al passo 5]
4. Salva

### 7. Struttura finale del Blob Storage

```
event-photos/
├── _index.json                    # Metadati eventi
├── APE2511-GE/
│   ├── foto1.jpg
│   ├── foto2.jpg
│   └── ...
├── APE2511-MI/
│   ├── foto1.jpg
│   └── ...
└── APE2511-TO/
    └── ...
```

### 8. Aggiornare _index.json quando aggiungi nuovi eventi

Il file `_index.json` nella root del container contiene i metadati di tutti gli eventi:

```json
{
  "events": [
    {
      "id": "APE2511-GE",
      "name": "Aperitivo Cluster Mesh - Genova",
      "date": "2025-11-25",
      "description": "Descrizione evento",
      "type": "Networking",
      "folder": "APE2511-GE"
    }
  ]
}
```

## Test

Dopo aver completato tutti i passi:
1. Vai su https://proud-pebble-091f8b903.3.azurestaticapps.net/gallery.html
2. Dovresti vedere i 3 eventi caricati
3. Cliccando su un evento vedrai le foto caricate per quell'evento

## Note

- Le immagini vengono servite con URL firmati SAS validi per 60 minuti
- Il container è privato, accessibile solo tramite le Azure Functions
- Nessun permesso admin AAD richiesto per questa soluzione
