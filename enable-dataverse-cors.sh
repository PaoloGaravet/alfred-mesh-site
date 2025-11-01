#!/bin/bash

# Script per abilitare CORS su Dataverse
# Esegui questo script per permettere chiamate dirette dal browser a Dataverse

echo "Per abilitare le chiamate dirette a Dataverse dalla gallery, un amministratore deve:"
echo ""
echo "1. Andare su Power Platform Admin Center"
echo "   https://admin.powerplatform.microsoft.com/"
echo ""
echo "2. Selezionare l'environment: 4bd35fe5-c3a2-e197-80d7-ff17e2922242"
echo ""
echo "3. Settings > Product > Features"
echo ""
echo "4. Abilitare 'Cross-Origin Resource Sharing (CORS)'"
echo ""
echo "5. Aggiungere l'origine: https://proud-pebble-091f8b903.3.azurestaticapps.net"
echo ""
echo "Oppure, in alternativa, possiamo usare un approccio diverso..."
echo ""
echo "========================================"
echo "ALTERNATIVA: Usa il tuo token personale"
echo "========================================"
echo ""
echo "Genera un token personale eseguendo:"
echo "az account get-access-token --resource https://org4bd35fe5.crm4.dynamics.com"
echo ""
echo "E configuralo come variabile d'ambiente DATAVERSE_USER_TOKEN"
