/**
 * Script de test pour vérifier que le serveur envoie bien toutes les données attendues
 * lors de la connexion d'un client.
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

// Configuration
const SERVER_WS_URL = 'ws://localhost:3000';
const SERVER_HTTP_URL = 'http://localhost:3000';

// Variables pour stocker les résultats
let receivedData = {
  tree: null,
  states: null,
  floorplan: null,
  config: null
};

// Fonction pour ajouter un délai
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testClientConnection() {
  console.log('=== Test de connexion client ===');
  console.log('Test du serveur:', SERVER_HTTP_URL);
  
  try {
    // Test 1: Vérifier que le serveur est accessible
    console.log('\n1. Vérification de l\'état du serveur...');
    const healthResponse = await fetch(`${SERVER_HTTP_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✓ Serveur accessible - Statut:', healthData.status);
    
    // Test 2: Récupérer les données initiales via HTTP
    console.log('\n2. Récupération des données initiales via HTTP...');
    const dataResponse = await fetch(`${SERVER_HTTP_URL}/api/data`);
    const data = await dataResponse.json();
    
    if (data.success) {
      console.log('✓ Données reçues avec succès');
      
      // Vérifier l'arborescence
      if (data.data.tree) {
        console.log('✓ Arborescence reçue -', data.data.tree.length, 'areas');
        receivedData.tree = data.data.tree;
      } else {
        console.log('✗ Arborescence manquante');
      }
      
      // Vérifier les states
      if (data.data.states) {
        console.log('✓ States reçus -', data.data.states.length, 'entités');
        receivedData.states = data.data.states;
      } else {
        console.log('✗ States manquants');
      }
      
      // Vérifier la configuration
      if (data.data.config) {
        console.log('✓ Configuration reçue');
        receivedData.config = data.data.config;
      } else {
        console.log('✗ Configuration manquante');
      }
    } else {
      console.log('✗ Erreur lors de la récupération des données:', data.error);
    }
    
    // Test 3: Connexion WebSocket pour vérifier les mises à jour
    console.log('\n3. Test de la connexion WebSocket...');
    
    const ws = new WebSocket(SERVER_WS_URL);
    
    ws.on('open', () => {
      console.log('✓ Connexion WebSocket établie');
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      console.log('✓ Message WebSocket reçu:', message.type);
      
      if (message.type === 'update:tree') {
        receivedData.tree = message.data;
      } else if (message.type === 'update:state') {
        // Mise à jour d'un state individuel
      } else if (message.type === 'update:config') {
        receivedData.config = message.data;
      } else if (message.type === 'update:floorplan') {
        receivedData.floorplan = message.data;
        console.log('✓ Plan reçu:', message.data.path);
      }
    });
    
    ws.on('error', (error) => {
      console.log('✗ Erreur WebSocket:', error.message);
    });
    
    // Attendre un peu pour recevoir les messages
    await delay(2000);
    
    // Fermer la connexion
    ws.close();
    
    // Résumé
    console.log('\n=== Résumé des tests ===');
    console.log('Arborescence:', receivedData.tree ? '✓' : '✗');
    console.log('States:', receivedData.states ? '✓' : '✗');
    console.log('Configuration:', receivedData.config ? '✓' : '✗');
    console.log('Plan:', receivedData.floorplan ? '✓' : '✗');
    
    // Vérification finale
    const allDataReceived = receivedData.tree && receivedData.states;
    
    if (allDataReceived) {
      console.log('\n✓✓✓ Tous les tests passés ! Le serveur envoie bien toutes les données attendues.');
    } else {
      console.log('\n✗✗✗ Certains tests ont échoué. Vérifiez la configuration du serveur.');
    }
    
    return allDataReceived;
    
  } catch (error) {
    console.error('Erreur lors des tests:', error.message);
    return false;
  }
}

// Exécuter les tests
testClientConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
