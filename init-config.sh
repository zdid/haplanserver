#!/bin/bash

# Création du répertoire config s'il n'existe pas
mkdir -p config

# Création des fichiers de configuration par défaut
cat > config/ha-config.json.example << 'EOF'
{
  "homeAssistant": {
    "apiKey": "votre_cle_api_longue_duree",
    "url": "ws://votre_home_assistant:8123",
    "verifySSL": true,
    "reconnectInterval": 5000
  }
}
EOF

cat > config/server-config.json << 'EOF'
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "staticFiles": "./public",
    "maxUploadSize": "10mb",
    "logLevel": "info"
  },
  "paths": {
    "configDir": "./config",
    "uploadDir": "./uploads"
  }
}
EOF

cat > config/client-config.json << 'EOF'
{
  "client": {
    "defaultView": "tree",
    "refreshInterval": 30000,
    "theme": "default",
    "floorplan": {
      "showLabels": true,
      "iconSize": "medium"
    }
  }
}
EOF

echo "Configuration initiale créée dans le répertoire 'config/"
echo "Ce répertoire est exclu de Git (.gitignore)"
echo "Pensez à :"
echo "1. Copier ha-config.json.example vers ha-config.json"
echo "2. Remplacer 'votre_cle_api_longue_duree' par votre vraie clé"
echo "3. Adapter l'URL de votre instance Home Assistant"