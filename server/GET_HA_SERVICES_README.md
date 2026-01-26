# Script de Récupération des Services Home Assistant

## Description

Ce script (`get-ha-services.js`) se connecte à votre instance Home Assistant et récupère la liste complète des services disponibles, puis les enregistre dans un fichier YAML (`ha-services.yaml`).

## Utilisation

### Prérequis

- Node.js installé
- Configuration Home Assistant valide (fichier `config/ha-config.json` ou variables d'environnement)
- Accès à l'instance Home Assistant

### Exécution

```bash
cd /chemin/vers/le/serveur
node get-ha-services.js
```

### Configuration

Le script utilise la même configuration que l'application principale :

1. **Variables d'environnement** (prioritaire) :
   - `HA_API_KEY` : Clé API Home Assistant
   - `HA_URL` : URL de l'instance Home Assistant (ex: `ws://homeassistant.local:8123`)
   - `HA_VERIFY_SSL` : Vérification SSL (par défaut: `true`)

2. **Fichier de configuration** :
   - `config/ha-config.json`

### Sortie

Le script génère un fichier `ha-services.yaml` contenant :

```yaml
light:
  turn_on:
    description: "Turn on a light"
    fields:
      entity_id:
        description: "Entity ID of the light"
        example: "light.living_room"
      brightness:
        description: "Brightness level (0-255)"
        example: 255
  turn_off:
    description: "Turn off a light"
    fields:
      entity_id:
        description: "Entity ID of the light"
        example: "light.living_room"
```

## Structure du Fichier YAML

```yaml
<domaine>:
  <service>:
    description: "Description du service"
    fields:
      <champ>:
        description: "Description du champ"
        example: "Valeur d'exemple"
```

## Exemple de Sortie Partielle

```yaml
light:
  turn_on:
    description: "Turn on a light"
    fields:
      entity_id:
        description: "Entity ID of the light"
        example: "light.living_room"
      brightness:
        description: "Brightness level (0-255)"
        example: 255
      color_temp:
        description: "Color temperature in mireds"
        example: 350
      rgb_color:
        description: "RGB color (array of 0-255 values)"
        example: [255, 100, 100]

  turn_off:
    description: "Turn off a light"
    fields:
      entity_id:
        description: "Entity ID of the light"
        example: "light.living_room"
      transition:
        description: "Duration of the transition in seconds"
        example: 1

media_player:
  play_media:
    description: "Play media on a media player"
    fields:
      entity_id:
        description: "Entity ID of the media player"
        example: "media_player.living_room_tv"
      media_content_id:
        description: "Media content ID"
        example: "https://example.com/video.mp4"
      media_content_type:
        description: "Type of media content"
        example: "video"
```

## Utilisation du Fichier Généré

Le fichier `ha-services.yaml` peut être utilisé pour :

1. **Documentation** : Comprendre les services disponibles
2. **Développement** : Connaître les champs requis pour chaque service
3. **Validation** : Vérifier les appels d'API
4. **Intégration** : Générer du code ou de la documentation automatique

## Nettoyage

Après avoir exécuté le script et généré le fichier YAML, vous pouvez supprimer le script :

```bash
rm get-ha-services.js
```

## Notes

- Le script doit être exécuté avec les mêmes permissions que l'application principale
- Assurez-vous que votre instance Home Assistant est accessible
- Le script peut prendre quelques secondes à s'exécuter selon le nombre de services
- Les descriptions et exemples sont basés sur les métadonnées fournies par Home Assistant

## Dépannage

### Erreur: "La clé API Home Assistant est requise"
- Vérifiez que `HA_API_KEY` est défini dans votre environnement ou dans `ha-config.json`

### Erreur: "L'URL Home Assistant est requise"
- Vérifiez que `HA_URL` est défini et qu'il est accessible

### Erreur: "Impossible de se connecter à Home Assistant"
- Vérifiez que l'URL est correcte (utilisez `ws://` pour WebSocket)
- Vérifiez que votre instance Home Assistant est en cours d'exécution
- Vérifiez les paramètres réseau et pare-feu

### Le script ne trouve aucun service
- Assurez-vous d'utiliser un compte avec les permissions appropriées
- Vérifiez que votre installation Home Assistant est complète

## Exemple d'Utilisation dans le Code

Une fois le fichier YAML généré, vous pouvez l'utiliser pour valider les appels de service :

```javascript
const yaml = require('js-yaml');
const fs = require('fs');

// Charger les services
const services = yaml.load(fs.readFileSync('ha-services.yaml', 'utf8'));

// Vérifier si un service existe
function isValidService(domain, service) {
  return services[domain] && services[domain][service];
}

// Obtenir les champs requis pour un service
function getServiceFields(domain, service) {
  if (isValidService(domain, service)) {
    return services[domain][service].fields;
  }
  return null;
}
```

## Licence

Ce script est fourni "tel quel" et peut être modifié selon vos besoins.