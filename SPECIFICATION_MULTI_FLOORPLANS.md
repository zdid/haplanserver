# Spécification pour la gestion multi-plans

## Introduction

Ce document décrit les modifications nécessaires côté serveur pour supporter la gestion de plusieurs plans d'étage avec des noms personnalisés.

## Modifications de l'API

### 1. Modification de l'API d'upload existante

**Endpoint actuel** : `POST /api/floorplan/upload`

**Nouveau format de requête** :
```json
{
  "floorplan": "file_content",
  "name": "Nom du plan",
  "description": "Description optionnelle"
}
```

**Réponse attendue** :
```json
{
  "success": true,
  "data": {
    "id": "generated_floorplan_id",
    "name": "Nom du plan",
    "path": "/uploads/generated_floorplan_id.png",
    "filename": "generated_floorplan_id.png",
    "description": "Description optionnelle",
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

### 2. Nouvelle API pour lister les plans

**Nouvel endpoint** : `GET /api/floorplans`

**Réponse attendue** :
```json
{
  "success": true,
  "data": {
    "currentFloorplanId": "plan_1",
    "floorplans": [
      {
        "id": "plan_1",
        "name": "Rez-de-chaussée",
        "path": "/uploads/plan_1.png",
        "filename": "plan_1.png",
        "description": "Plan du rez-de-chaussée",
        "createdAt": "2024-01-01T12:00:00Z",
        "updatedAt": "2024-01-01T12:00:00Z"
      },
      {
        "id": "plan_2",
        "name": "Étage",
        "path": "/uploads/plan_2.png",
        "filename": "plan_2.png",
        "createdAt": "2024-01-02T12:00:00Z",
        "updatedAt": "2024-01-02T12:00:00Z"
      }
    ]
  }
}
```

### 3. Nouvelle API pour changer de plan courant

**Nouvel endpoint** : `POST /api/floorplan/set-current`

**Format de requête** :
```json
{
  "floorplanId": "plan_2"
}
```

**Réponse attendue** :
```json
{
  "success": true,
  "data": {
    "currentFloorplanId": "plan_2",
    "previousFloorplanId": "plan_1"
  }
}
```

### 4. Nouvelle API pour supprimer un plan

**Nouvel endpoint** : `DELETE /api/floorplan/{floorplanId}`

**Réponse attendue** :
```json
{
  "success": true,
  "data": {
    "deletedFloorplanId": "plan_2",
    "currentFloorplanId": "plan_1"
  }
}
```

## Messages WebSocket

### Nouveau type de message pour les mises à jour de plans

**Type** : `floorplans_updated`

**Format du message** :
```json
{
  "type": "floorplans_updated",
  "payload": {
    "currentFloorplanId": "plan_2",
    "floorplans": [
      {
        "id": "plan_1",
        "name": "Rez-de-chaussée",
        "path": "/uploads/plan_1.png",
        "filename": "plan_1.png"
      },
      {
        "id": "plan_2",
        "name": "Étage",
        "path": "/uploads/plan_2.png",
        "filename": "plan_2.png"
      }
    ]
  }
}
```

## Base de données

### Structure de la table floorplans

```sql
CREATE TABLE floorplans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  description TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_name (name)
);
```

### Exemple de données

```sql
INSERT INTO floorplans (id, name, filename, path, description, is_current) VALUES
('plan_1', 'Rez-de-chaussée', 'plan_1.png', '/uploads/plan_1.png', 'Plan du rez-de-chaussée', TRUE),
('plan_2', 'Étage', 'plan_2.png', '/uploads/plan_2.png', 'Plan de l''étage', FALSE);
```

## Logique métier

### Gestion des noms de plans

1. **Unicité** : Les noms de plans doivent être uniques
2. **Validation** : 
   - Longueur minimale : 3 caractères
   - Longueur maximale : 100 caractères
   - Caractères autorisés : lettres, chiffres, espaces, tirets, underscores
3. **Noms par défaut** : Si aucun nom n'est fourni, utiliser "Plan {timestamp}"

### Gestion du plan courant

1. Toujours avoir un plan courant défini
2. Si le plan courant est supprimé, le remplacer par le premier plan disponible
3. Si aucun plan n'existe, créer un plan par défaut

### Upload de plans

1. Vérifier que le nom est unique (ou ajouter un suffixe si duplicata)
2. Générer un ID unique pour le plan
3. Sauvegarder le fichier avec l'ID comme nom de fichier
4. Mettre à jour la base de données
5. Si c'est le premier plan, le définir comme courant
6. Envoyer une notification WebSocket `floorplans_updated`

### Changement de plan courant

1. Vérifier que le plan existe
2. Mettre à jour le champ `is_current` dans la base de données
3. Envoyer une notification WebSocket `floorplans_updated`

## Sécurité

### Validation des entrées

1. Valider les noms de plans selon les règles définies
2. Valider les IDs de plans (format UUID ou autre format défini)
3. Limiter la taille des fichiers uploadés (ex: 5MB max)
4. Valider les types de fichiers (images uniquement : PNG, JPG, JPEG)

### Autorisation

1. Vérifier que l'utilisateur est authentifié pour toutes les opérations
2. Vérifier les permissions pour les opérations sensibles (suppression)

## Erreurs et gestion des exceptions

### Codes d'erreur recommandés

```json
// Nom de plan duplicata
{
  "success": false,
  "error": "duplicate_floorplan_name",
  "message": "Un plan avec ce nom existe déjà"
}

// Plan non trouvé
{
  "success": false,
  "error": "floorplan_not_found",
  "message": "Le plan spécifié n'existe pas"
}

// Nom de plan invalide
{
  "success": false,
  "error": "invalid_floorplan_name",
  "message": "Le nom du plan ne respecte pas les règles de validation"
}

// Fichier trop volumineux
{
  "success": false,
  "error": "file_too_large",
  "message": "Le fichier dépasse la taille maximale autorisée (5MB)"
}

// Type de fichier non supporté
{
  "success": false,
  "error": "unsupported_file_type",
  "message": "Seuls les fichiers PNG, JPG et JPEG sont supportés"
}
```

## Exemples d'implémentation

### Exemple de contrôleur (pseudo-code)

```javascript
// Upload d'un plan
app.post('/api/floorplan/upload', async (req, res) => {
  try {
    const { name, description } = req.body;
    const file = req.files.floorplan;
    
    // Validation
    if (!isValidFloorplanName(name)) {
      return res.status(400).json({ success: false, error: 'invalid_floorplan_name' });
    }
    
    if (await floorplanNameExists(name)) {
      return res.status(400).json({ success: false, error: 'duplicate_floorplan_name' });
    }
    
    // Générer ID et sauvegarder fichier
    const floorplanId = generateUUID();
    const filename = `${floorplanId}.png`;
    const path = `/uploads/${filename}`;
    
    await saveFile(file, path);
    
    // Sauvegarder en base de données
    const floorplan = await createFloorplan({
      id: floorplanId,
      name,
      filename,
      path,
      description
    });
    
    // Si c'est le premier plan, le définir comme courant
    if (await isFirstFloorplan()) {
      await setCurrentFloorplan(floorplanId);
      floorplan.isCurrent = true;
    }
    
    // Notifier les clients via WebSocket
    broadcastFloorplansUpdate();
    
    res.json({ success: true, data: floorplan });
  } catch (error) {
    res.status(500).json({ success: false, error: 'internal_server_error' });
  }
});

// Récupérer la liste des plans
app.get('/api/floorplans', async (req, res) => {
  try {
    const floorplans = await getAllFloorplans();
    const currentFloorplan = await getCurrentFloorplan();
    
    res.json({
      success: true,
      data: {
        currentFloorplanId: currentFloorplan?.id || null,
        floorplans
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'internal_server_error' });
  }
});

// Définir le plan courant
app.post('/api/floorplan/set-current', async (req, res) => {
  try {
    const { floorplanId } = req.body;
    
    if (!await floorplanExists(floorplanId)) {
      return res.status(404).json({ success: false, error: 'floorplan_not_found' });
    }
    
    const previousFloorplan = await getCurrentFloorplan();
    await setCurrentFloorplan(floorplanId);
    
    // Notifier les clients via WebSocket
    broadcastFloorplansUpdate();
    
    res.json({
      success: true,
      data: {
        currentFloorplanId: floorplanId,
        previousFloorplanId: previousFloorplan?.id || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'internal_server_error' });
  }
});
```

## Tests recommandés

### Cas de test pour l'API

1. **Upload de plan**
   - Upload avec nom valide
   - Upload sans nom (doit générer un nom par défaut)
   - Upload avec nom duplicata (doit échouer)
   - Upload avec nom invalide (doit échouer)
   - Upload avec fichier trop volumineux (doit échouer)
   - Upload avec type de fichier non supporté (doit échouer)

2. **Liste des plans**
   - Récupérer la liste lorsque des plans existent
   - Récupérer la liste lorsqu'aucun plan n'existe
   - Vérifier que le plan courant est correctement identifié

3. **Changement de plan courant**
   - Changer vers un plan existant
   - Changer vers un plan inexistant (doit échouer)
   - Changer lorsque seul un plan existe

4. **Suppression de plan**
   - Supprimer un plan non courant
   - Supprimer le plan courant (doit mettre à jour le plan courant)
   - Supprimer le dernier plan (doit échouer ou créer un plan par défaut)

## Migration des données existantes

Si vous avez déjà des plans existants dans le système, vous devrez :

1. Créer la table `floorplans`
2. Parcourir les plans existants et les ajouter à la table
3. Définir un plan courant par défaut
4. Mettre à jour les références dans le code existant

## Étapes d'implémentation recommandées

1. **Créer la structure de la base de données**
2. **Implémenter les modèles et repositories**
3. **Créer les endpoints API**
4. **Ajouter la validation des entrées**
5. **Implémenter la logique WebSocket**
6. **Écrire les tests unitaires et d'intégration**
7. **Migrer les données existantes**
8. **Mettre à jour la documentation API**

## Notes supplémentaires

- Considérez l'ajout de pagination si vous prévoyez d'avoir beaucoup de plans
- Vous pourriez vouloir ajouter des métadonnées supplémentaires comme la taille du plan, les dimensions, etc.
- Pensez à la gestion des versions si les plans peuvent être modifiés
- L'ajout de tags ou catégories pour organiser les plans pourrait être utile

Cette spécification devrait vous fournir toutes les informations nécessaires pour implémenter le support multi-plans côté serveur. Une fois cette implémentation terminée, je pourrai adapter le code client pour utiliser ces nouvelles APIs.