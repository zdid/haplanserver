#!/usr/bin/env node

/**
 * Script pour récupérer la liste des services Home Assistant
 * et les enregistrer dans un fichier YAML.
 * 
 * Ce script est conçu pour être exécuté une seule fois afin de
 * générer une documentation des services disponibles.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const dotenv = require('dotenv');
const haModule = require("home-assistant-js-websocket");
const { createConnection, createLongLivedTokenAuth } = haModule;
// Charger les variables d'environnement
dotenv.config();

// Charger la configuration
function loadConfig() {
  try {
    const configDir = path.resolve(__dirname, '../config');
    console.log('Chargement de la configuration depuis:', configDir);
    
    // Charger la configuration HA depuis les variables d'environnement ou les fichiers
    const haConfig = {
      apiKey: process.env.HA_API_KEY,
      url: process.env.HA_URL,
      verifySSL: process.env.HA_VERIFY_SSL !== 'false'
    };
    
    // Essayer de charger depuis le fichier ha-config.json
    try {
      const haConfigPath = path.join(configDir, 'ha-config.json');
      if (fs.existsSync(haConfigPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(haConfigPath, 'utf8'));
        Object.assign(haConfig, fileConfig.homeAssistant || fileConfig);
      }
    } catch (fileError) {
      console.warn("Avertissement: Impossible de charger ha-config.json, utilisation de la configuration par défaut");
    }
    
    // Validation de la configuration
    if (!haConfig.apiKey) {
      throw new Error("La clé API Home Assistant est requise (HA_API_KEY)");
    }
    if (!haConfig.url) {
      throw new Error("L'URL Home Assistant est requise (HA_URL)");
    }
    
    console.log('Configuration chargée avec succès');
    console.log('- URL:', haConfig.url);
    console.log('- Verify SSL:', haConfig.verifySSL);
    console.log('- API Key:', haConfig.apiKey ? '****' : 'non définie');
    
    return haConfig;
    
  } catch (error) {
    console.error("Erreur de chargement de la configuration:", error.message);
    process.exit(1);
  }
}

// Se connecter à Home Assistant et récupérer les services
async function getHAServices(haConfig) {
  try {
    console.log('\nConnexion à Home Assistant...');
    
    // Configurer l'authentification
    const auth = await createLongLivedTokenAuth(haConfig.url, haConfig.apiKey);
    
    // Créer la connexion
    const connection = await createConnection({ auth });
    
    console.log('Connecté à Home Assistant avec succès !');
    
    // Récupérer la liste des services
    console.log('\nRécupération de la liste des services...');
    
    const servicesResponse = await connection.sendMessagePromise({
      type: 'get_services'
    });
    
    console.log(`Trouvé ${Object.keys(servicesResponse).length} domaines de services`);
    
    return servicesResponse;
    
  } catch (error) {
    console.error("Erreur lors de la récupération des services:", error);
    process.exit(1);
  }
}

// Formater les services pour YAML
function formatServicesForYAML(services) {
  const formatted = {};
  
  // Parcourir chaque domaine
  for (const [domain, domainServices] of Object.entries(services)) {
    formatted[domain] = {};
    
    // Parcourir chaque service dans le domaine
    for (const [serviceName, serviceInfo] of Object.entries(domainServices)) {
      formatted[domain][serviceName] = {
        description: serviceInfo.description || '',
        fields: serviceInfo.fields || {}
      };
    }
  }
  
  return formatted;
}

// Écrire les services dans un fichier YAML
function writeServicesToYAML(services, outputPath) {
  try {
    console.log(`\nÉcriture des services dans ${outputPath}...`);
    
    const yamlContent = yaml.dump(services, {
      sorting: true,
      indent: 2,
      lineWidth: -1
    });
    
    fs.writeFileSync(outputPath, yamlContent, 'utf8');
    
    console.log('Fichier YAML généré avec succès !');
    console.log(`Chemin: ${path.resolve(outputPath)}`);
    console.log(`Taille: ${yamlContent.length} caractères`);
    
  } catch (error) {
    console.error("Erreur lors de l'écriture du fichier YAML:", error);
    process.exit(1);
  }
}

// Fonction principale
async function main() {
  console.log('=== Récupération des services Home Assistant ===\n');
  
  // Charger la configuration
  const haConfig = loadConfig();
  
  // Charger les dépendances HA dynamiquement
  console.log('\nChargement des dépendances Home Assistant...');
  const wnd = globalThis;
  wnd.WebSocket = require('ws');
  
  // Charger le module home-assistant-js-websocket
  
  
  
  // Récupérer les services
  const services = await getHAServices(haConfig);
  
  // Formater pour YAML
  const formattedServices = formatServicesForYAML(services);
  
  // Écrire dans un fichier
  const outputPath = path.join(__dirname, 'ha-services.yaml');
  writeServicesToYAML(formattedServices, outputPath);
  
  console.log('\n=== Opération terminée ===');
  console.log('\nLe fichier ha-services.yaml a été généré.');
  console.log('Vous pouvez maintenant supprimer ce script (get-ha-services.js).');
  console.log('\nPour utiliser ce script à nouveau, exécutez:');
  console.log('  node get-ha-services.js');
}

// Exécuter le script
main().catch(error => {
  console.error("Erreur fatale:", error);
  process.exit(1);
});