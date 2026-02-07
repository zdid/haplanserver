#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Initialisation du fichier de configuration des floorplans...');

// Chemin du fichier de configuration
const configDir = path.join(__dirname, 'config');
const configFile = path.join(configDir, 'floorplan-config.json');

try {
  // Vérifier si le répertoire config existe
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log('Répertoire config créé:', configDir);
  }

  // Créer un fichier de configuration vide avec la bonne structure
  const initialConfig = {};
  
  fs.writeFileSync(configFile, JSON.stringify(initialConfig, null, 2));
  console.log('Fichier de configuration initialisé:', configFile);
  console.log('Structure initiale:');
  console.log(JSON.stringify(initialConfig, null, 2));
  
  console.log('\nExemple d\'ajout manuel d\'un floorplan:');
  console.log(JSON.stringify({
    "rez de chaussée": {
      "filename": "rez de chaussee.png",
      "URL": "download/rez de chausse.png",
      "positions": [
        {
          "entity_id": "light.cuisine",
          "x": 100,
          "y": 200
        }
      ]
    }
  }, null, 2));
  
} catch (error) {
  console.error('Erreur lors de l\'initialisation:', error);
  process.exit(1);
}