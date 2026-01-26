// Script de test pour vérifier l'écriture des collections
const fs = require('fs');
const path = require('path');

// Chemin du répertoire de collections
const collectionsDir = path.join(__dirname, 'collections');

// Vérifier si le répertoire existe
if (!fs.existsSync(collectionsDir)) {
  console.log('Le répertoire de collections n\'existe pas encore. Il sera créé au démarrage du serveur.');
} else {
  // Lister les fichiers dans le répertoire
  const files = fs.readdirSync(collectionsDir);
  console.log('Fichiers de collections existants:', files);
  
  // Vérifier si des fichiers de collections ont été créés
  const collectionFiles = files.filter(file => 
    file.startsWith('areas-') || file.startsWith('devices-') || file.startsWith('entities-')
  );
  
  if (collectionFiles.length > 0) {
    console.log('Fichiers de collections trouvés:', collectionFiles);
    
    // Lire et afficher un exemple de fichier
    if (collectionFiles.length >= 3) {
      const areasFile = collectionFiles.find(f => f.startsWith('areas-'));
      const devicesFile = collectionFiles.find(f => f.startsWith('devices-'));
      const entitiesFile = collectionFiles.find(f => f.startsWith('entities-'));
      
      console.log('\n--- Exemple de données des zones ---');
      const areasData = JSON.parse(fs.readFileSync(path.join(collectionsDir, areasFile), 'utf8'));
      console.log('Nombre de zones:', areasData.length);
      if (areasData.length > 0) {
        console.log('Première zone:', JSON.stringify(areasData[0], null, 2));
      }
      
      console.log('\n--- Exemple de données des appareils ---');
      const devicesData = JSON.parse(fs.readFileSync(path.join(collectionsDir, devicesFile), 'utf8'));
      console.log('Nombre d\'appareils:', devicesData.length);
      if (devicesData.length > 0) {
        console.log('Premier appareil:', JSON.stringify(devicesData[0], null, 2));
      }
      
      console.log('\n--- Exemple de données des entités ---');
      const entitiesData = JSON.parse(fs.readFileSync(path.join(collectionsDir, entitiesFile), 'utf8'));
      console.log('Nombre d\'entités:', entitiesData.length);
      if (entitiesData.length > 0) {
        console.log('Première entité:', JSON.stringify(entitiesData[0], null, 2));
      }
    }
  } else {
    console.log('Aucun fichier de collection trouvé. Le serveur doit être démarré pour générer les collections.');
  }
}