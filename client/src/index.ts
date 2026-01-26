// Point d'entrée de l'application

// Importer le contrôleur principal
import { FloorplanController } from './core/controllers/floorplan-controller';

// Initialiser l'application une fois le DOM chargé
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing Home Assistant Floorplan Client...');
  new FloorplanController();
});
