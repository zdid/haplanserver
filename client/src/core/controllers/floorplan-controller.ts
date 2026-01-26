import { StateManager } from './state-manager';
import { APIService } from '../services/api-service';
import { WebSocketService } from '../services/websocket-service';
import { FloorplanRenderer } from '../../components/floorplan/floorplan-renderer';
import { InitialData, HAEntity, HAState, HADevice } from '../types/ha-types';
import { FloorplanObject } from '../types/client-types';

export class FloorplanController {
  private stateManager: StateManager;
  private apiService: APIService;
  private websocketService: WebSocketService;
  private floorplanRenderer: FloorplanRenderer;

  constructor() {
    this.apiService = new APIService();
    this.websocketService = new WebSocketService();
    this.stateManager = new StateManager(this.apiService);
    
    // Initialiser le renderer une fois le DOM chargé
    document.addEventListener('DOMContentLoaded', () => {
      const container = document.getElementById('floorplan-wrapper')!;
      this.floorplanRenderer = new FloorplanRenderer(container);
      this.initialize();
    });
  }

  private async initialize(): Promise<void> {
    try {
      // Suspendre l'affichage du spinner pour l'instant
      // this.showLoading('Chargement des données initiales...');
      
      // Charger les données initiales
      const initialData = await this.apiService.getInitialData();
      
      // Initialiser l'état
      this.initializeState(initialData);
      
      // Configurer WebSocket
      this.setupWebSocket();
      
      // Configurer l'interface utilisateur
      this.setupUI();
      
      // Charger le plan si disponible
      if (initialData.floorplan?.path) {
        const floorplanPath = initialData.floorplan.path;
        console.log('Floorplan path received:', floorplanPath);
        
        // Vérifier si le chemin est absolu ou relatif
        const fullPath = floorplanPath.startsWith('http') 
          ? floorplanPath 
          : `${this.apiService['baseUrl']}/${floorplanPath}`;
        
        console.log('Loading floorplan from:', fullPath);
        this.floorplanRenderer.renderPlan(fullPath);
      }
      
      // Suspendre le masquage du spinner pour l'instant
      // this.hideLoading();
      console.log('Initialisation complète (spinner suspendu)');

      // Initialisation terminée
      console.log('Initialisation terminée');
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize application');
    }
  }

  private initializeState(data: InitialData): void {
    // Déterminer si un plan est disponible
    const hasFloorplan = !!data.floorplan?.path;
    
    // Mettre à jour l'état initial
    this.stateManager.updateState({
      hasFloorplan,
      lastRefresh: Date.now(),
      initialData: data // Stocker les données initiales pour référence future
    });
    
    // Passer les données initiales au renderer
    this.floorplanRenderer.setInitialData(data);
    
    // Mettre en mode paramétrage au démarrage pour la phase d'essai
    this.stateManager.enterParametrageMode();
    
    // Mettre à jour les entités disponibles
    const allEntities = data.tree.flatMap(area =>
      area.devices.flatMap(device => device.entities)
    );
    this.stateManager.updateAvailableEntities(allEntities);
    
    // Si des positions sont sauvegardées, les restaurer
    // (Dans une implémentation complète, on les récupérerait du serveur)
    if (data.config?.positions) {
      this.restorePositions(data.config.positions);
    }
    
    console.log('Initialization complete. State:', this.stateManager.getState());
  }

  private setupWebSocket(): void {
    this.websocketService.onConnect(() => {
      console.log('WebSocket connected');
    });

    this.websocketService.onDisconnect(() => {
      console.log('WebSocket disconnected');
    });

    // Gestion des messages WebSocket
    this.websocketService.onMessage('update:tree', (data) => {
      this.handleTreeUpdate(data);
    });

    this.websocketService.onMessage('update:state', (data: HAState) => {
      this.handleStateUpdate(data);
    });

    this.websocketService.onMessage('update:config', (data) => {
      this.handleConfigUpdate(data);
    });

    this.websocketService.onMessage('update:floorplan', (data) => {
      this.handleFloorplanUpdate(data);
    });

    // Connexion
    this.websocketService.connect();
  }

  private setupUI(): void {
    // Icône de menu hamburger
    document.getElementById('menu-icon')?.addEventListener('click', () => {
      this.toggleMenu();
    });

    // Bouton de fermeture du menu
    document.getElementById('close-menu')?.addEventListener('click', () => {
      this.closeMenu();
    });

    // Bouton d'upload pour le premier plan
    document.getElementById('upload-first-floorplan')?.addEventListener('click', () => {
      this.handleUploadClick();
    });

    // Abonnement aux changements d'état
    this.stateManager.subscribe(state => {
      this.updateUIForState(state);
    });
  }

  private updateUIForState(state: any): void {
    // Mettre à jour la visibilité de la poubelle
    const trashIcon = document.getElementById('trash-icon')!;
    trashIcon.classList.toggle('masque', state.mode !== 'parametrage');

    // Mettre à jour la visibilité du message "aucun plan"
    const noFloorplanMsg = document.getElementById('no-floorplan-message')!;
    noFloorplanMsg.classList.toggle('masque', state.hasFloorplan);

    // Mettre à jour le menu contextuel selon le mode
    this.updateContextMenu(state.mode);
  }

  private updateContextMenu(mode: string): void {
    const menuContent = document.getElementById('menu-content')!;
    menuContent.innerHTML = '';

    if (mode === 'parametrage') {
      // Menu en mode paramétrage
      const menuTitle = document.getElementById('menu-title')!;
      menuTitle.textContent = 'Mode Paramétrage';

      // Option pour quitter le mode paramétrage
      const exitItem = document.createElement('div');
      exitItem.className = 'menu-item';
      exitItem.innerHTML = '<i class="fas fa-times"></i> Quitter le mode paramétrage';
      exitItem.addEventListener('click', () => {
        try {
          this.stateManager.exitParametrageMode();
          this.closeMenu();
        } catch (error) {
          this.showError(error.message);
        }
      });
      menuContent.appendChild(exitItem);

      // Option pour upload un plan
      const uploadItem = document.createElement('div');
      uploadItem.className = 'menu-item';
      uploadItem.innerHTML = '<i class="fas fa-upload"></i> Upload un plan';
      uploadItem.addEventListener('click', () => {
        this.handleUploadClick();
        this.closeMenu();
      });
      menuContent.appendChild(uploadItem);

      // Option pour rafraîchir les données
      const refreshItem = document.createElement('div');
      refreshItem.className = 'menu-item';
      refreshItem.innerHTML = '<i class="fas fa-sync"></i> Rafraîchir les données';
      refreshItem.addEventListener('click', () => {
        this.refreshData();
        this.closeMenu();
      });
      menuContent.appendChild(refreshItem);

      // Séparateur
      const separator = document.createElement('div');
      separator.style.height = '1px';
      separator.style.backgroundColor = '#333';
      separator.style.margin = '10px 0';
      menuContent.appendChild(separator);

      // Interface avec combobox en cascade pour les entités disponibles
      console.log('[TRACE] FloorplanController: Création de l\'interface de sélection d\'entités avec combobox en cascade');
      
      // Récupérer les données depuis l'état
      const initialData = this.stateManager.getState().initialData;
      const existingEntities = this.stateManager.getState().objects.map(obj => obj.entity_id);
      
      if (!initialData || !initialData.tree) {
        console.warn('[TRACE] FloorplanController: Aucune arborescence disponible depuis le serveur');
        return;
      }
      
      console.log('[TRACE] FloorplanController: Arborescence reçue avec', initialData.tree.length, 'areas');
      
      // Créer l'en-tête
      const entitiesHeader = document.createElement('div');
      entitiesHeader.className = 'menu-item';
      entitiesHeader.style.fontWeight = 'bold';
      entitiesHeader.style.cursor = 'default';
      entitiesHeader.style.marginTop = '15px';
      entitiesHeader.innerHTML = '<i class="fas fa-list"></i> Entités disponibles';
      menuContent.appendChild(entitiesHeader);
      
      // Créer le conteneur pour les combobox
      const comboboxContainer = document.createElement('div');
      comboboxContainer.style.marginTop = '10px';
      comboboxContainer.id = 'entity-selection-comboboxes';
      menuContent.appendChild(comboboxContainer);
      
      // Combobox pour les areas
      const areaSelect = document.createElement('select');
      areaSelect.id = 'entity-area-select';
      areaSelect.className = 'entity-combobox';
      areaSelect.style.width = '100%';
      areaSelect.style.padding = '8px';
      areaSelect.style.marginBottom = '10px';
      areaSelect.style.borderRadius = '4px';
      areaSelect.style.border = '1px solid #4CAF50';
      areaSelect.style.backgroundColor = '#1a1a1a';
      areaSelect.style.color = 'white';
      
      const areaDefaultOption = document.createElement('option');
      areaDefaultOption.value = '';
      areaDefaultOption.textContent = '-- Sélectionnez une pièce --';
      areaSelect.appendChild(areaDefaultOption);
      
      // Remplir avec les areas qui ont des devices
      
      initialData.tree.forEach(area => {
        if (area.devices && area.devices.length > 0) {
          // Utiliser area_id ou name comme valeur
          const areaValue = area.area_id || area.name || `area_${Math.random().toString(36).substr(2, 9)}`;
          
          const option = document.createElement('option');
          option.value = areaValue;
          option.textContent = area.name || areaValue;
          areaSelect.appendChild(option);
        }
      });
      
      comboboxContainer.appendChild(areaSelect);
      
      // Combobox pour les devices (masqué initialement)
      const deviceSelect = document.createElement('select');
      deviceSelect.id = 'entity-device-select';
      deviceSelect.className = 'entity-combobox';
      deviceSelect.style.width = '100%';
      deviceSelect.style.padding = '8px';
      deviceSelect.style.marginBottom = '10px';
      deviceSelect.style.borderRadius = '4px';
      deviceSelect.style.border = '1px solid #8BC34A';
      deviceSelect.style.backgroundColor = '#1a1a1a';
      deviceSelect.style.color = 'white';
      deviceSelect.style.display = 'none';
      
      const deviceDefaultOption = document.createElement('option');
      deviceDefaultOption.value = '';
      deviceDefaultOption.textContent = '-- Sélectionnez un appareil --';
      deviceSelect.appendChild(deviceDefaultOption);
      
      comboboxContainer.appendChild(deviceSelect);
      
      // Combobox pour les entités (masqué initialement)
      const entitySelect = document.createElement('select');
      entitySelect.id = 'entity-entity-select';
      entitySelect.className = 'entity-combobox';
      entitySelect.style.width = '100%';
      entitySelect.style.padding = '8px';
      entitySelect.style.marginBottom = '10px';
      entitySelect.style.borderRadius = '4px';
      entitySelect.style.border = '1px solid #2196F3';
      entitySelect.style.backgroundColor = '#1a1a1a';
      entitySelect.style.color = 'white';
      entitySelect.style.display = 'none';
      
      const entityDefaultOption = document.createElement('option');
      entityDefaultOption.value = '';
      entityDefaultOption.textContent = '-- Sélectionnez une entité --';
      entitySelect.appendChild(entityDefaultOption);
      
      comboboxContainer.appendChild(entitySelect);
      
      // Gestion de la sélection d'area
      areaSelect.addEventListener('change', (e) => {
        const selectedAreaValue = (e.target as HTMLSelectElement).value;
        
        if (!selectedAreaValue) {
          deviceSelect.style.display = 'none';
          entitySelect.style.display = 'none';
          return;
        }
        
        // Trouver l'area correspondante (recherche par area_id ou name)
        const selectedArea = initialData.tree.find(area => 
          area.area_id === selectedAreaValue || area.name === selectedAreaValue
        );
        
        // Utiliser le nom de l'area pour les traces
        const areaName = selectedArea ? selectedArea.name : selectedAreaValue;
        
        console.log('[TRACE] FloorplanController: 📍 Area sélectionnée:', areaName);
        
        if (!selectedArea || !selectedArea.devices || selectedArea.devices.length === 0) {
          console.warn('[TRACE] FloorplanController: Aucun device trouvé pour cette area');
          deviceSelect.style.display = 'none';
          entitySelect.style.display = 'none';
          return;
        }
        
        // Vider et masquer les combobox suivantes
        deviceSelect.innerHTML = '';
        deviceSelect.appendChild(deviceDefaultOption.cloneNode(true));
        entitySelect.innerHTML = '';
        entitySelect.appendChild(entityDefaultOption.cloneNode(true));
        entitySelect.style.display = 'none';
        
        // Remplir la combobox des devices
        console.log('[TRACE] FloorplanController: Remplissage des devices pour area:', selectedArea.name);
        console.log('[TRACE] FloorplanController: Devices disponibles:', selectedArea.devices);
        
        selectedArea.devices.forEach(device => {
          // Utiliser device_id ou name comme valeur
          const deviceValue = device.device_id || device.name || `device_${Math.random().toString(36).substr(2, 9)}`;
          
          const option = document.createElement('option');
          option.value = deviceValue;
          option.textContent = device.name || deviceValue;
          deviceSelect.appendChild(option);
        });
        
        deviceSelect.style.display = 'block';
        
        // Si un seul device, auto-sélectionner et afficher les entités
        if (selectedArea.devices.length === 1) {
          const onlyDevice = selectedArea.devices[0];
          const deviceValue = onlyDevice.device_id || onlyDevice.name || `device_${Math.random().toString(36).substr(2, 9)}`;
          deviceSelect.value = deviceValue;
          
          console.log('[TRACE] FloorplanController: Auto-sélection du device unique:', deviceValue);
          
          // Déclencher le changement manuellement
          const deviceChangeEvent = new Event('change');
          deviceSelect.dispatchEvent(deviceChangeEvent);
        }
      });
      
      // Gestion de la sélection de device
      deviceSelect.addEventListener('change', (e) => {
        const selectedDeviceValue = (e.target as HTMLSelectElement).value;
        
        if (!selectedDeviceValue) {
          entitySelect.style.display = 'none';
          return;
        }
        
        // Trouver le nom du device pour les traces
        const areaValueForTrace = areaSelect.value;
        const areaForTrace = initialData.tree.find(area => 
          area.area_id === areaValueForTrace || area.name === areaValueForTrace
        );
        const areaNameForTrace = areaForTrace ? areaForTrace.name : areaValueForTrace;
        
        const deviceForTrace = areaForTrace?.devices?.find(device => 
          device.device_id === selectedDeviceValue || device.name === selectedDeviceValue
        );
        const deviceNameForTrace = deviceForTrace ? deviceForTrace.name : selectedDeviceValue;
        
        console.log('[TRACE] FloorplanController: 📍 Area sélectionnée:', areaNameForTrace);
        console.log('[TRACE] FloorplanController: 🖥️ Device sélectionné:', areaNameForTrace, '->', deviceNameForTrace);
        
        // Trouver le device sélectionné
        const selectedAreaValue = areaSelect.value;
        const selectedArea = initialData.tree.find(area => 
          area.area_id === selectedAreaValue || area.name === selectedAreaValue
        );
        
        if (!selectedArea) {
          console.warn('[TRACE] FloorplanController: Area non trouvée pour value:', selectedAreaValue);
          return;
        }
        
        // Recherche par device_id OU name
        const selectedDevice = selectedArea.devices.find(device => 
          device.device_id === selectedDeviceValue || device.name === selectedDeviceValue
        );
        
        if (!selectedDevice) {
          console.warn('[TRACE] FloorplanController: Device non trouvé pour value:', selectedDeviceValue);
          entitySelect.style.display = 'none';
          return;
        }
        
        if (!selectedDevice.entities || selectedDevice.entities.length === 0) {
          console.warn('[TRACE] FloorplanController: Device trouvé mais aucune entité disponible');
          entitySelect.style.display = 'none';
          return;
        }
        
        console.log('[TRACE] FloorplanController: Device trouvé avec entités:', selectedDevice);
        console.log('[TRACE] FloorplanController: Entités brutes:', selectedDevice.entities);
        console.log('[TRACE] FloorplanController: Entités déjà sur le plan:', existingEntities);
        
        // Vider la combobox des entités
        entitySelect.innerHTML = '';
        entitySelect.appendChild(entityDefaultOption.cloneNode(true));
        
        // Convertir les entités en tableau si ce n'est pas déjà le cas
        const entitiesArray = Array.isArray(selectedDevice.entities) 
          ? selectedDevice.entities 
          : Object.values(selectedDevice.entities);
        
        console.log('[TRACE] FloorplanController: Type d\'entités:', Array.isArray(selectedDevice.entities) ? 'Tableau' : 'Objet');
        console.log('[TRACE] FloorplanController: Entités converties en tableau:', entitiesArray);
        
        // Filtrer les entités selon les conditions
        const availableEntities = entitiesArray.filter(entity => {
          // 1. Pas déjà sur le plan
          const alreadyOnPlan = existingEntities.includes(entity.entity_id);
          
          // 2. Pas un config ou diagnostic
          const isConfigOrDiagnostic = entity.entity_id.startsWith('config.') || 
                                       entity.entity_id.startsWith('diagnostic.') ||
                                       entity.entity_id.includes('_config') ||
                                       entity.entity_id.includes('_diagnostic');
          
          // 3. Visible (ou non marquée comme non-visible)
          const isVisible = entity.visible !== false;
          
          const isAvailable = !alreadyOnPlan && !isConfigOrDiagnostic && isVisible;
          
          // Trouver le nom de l'entité depuis le state
          const entityState = initialData.states ? initialData.states[entity.entity_id] : null;
          const entityDisplayName = entityState ? entityState.attributes.friendly_name || entityState.attributes.name || entity.name : entity.name;
          
          console.log('[TRACE] FloorplanController: 🔌 Entité:', areaNameForTrace, '->', deviceNameForTrace, '->', entityDisplayName || entity.entity_id);
          console.log('[TRACE] FloorplanController:    Filtrage:', 
                      '| Sur plan:', alreadyOnPlan, 
                      '| Config/Diag:', isConfigOrDiagnostic, 
                      '| Visible:', isVisible, 
                      '| Résultat:', isAvailable);
          
          return isAvailable;
        });
        
        console.log('[TRACE] FloorplanController: Entités disponibles pour ce device:', availableEntities.length, 
                    '/', entitiesArray.length);
        console.log('[TRACE] FloorplanController: Entités disponibles:', availableEntities);
        
        // Remplir la combobox des entités
        availableEntities.forEach(entity => {
          if (!entity || !entity.entity_id) {
            console.warn('[TRACE] FloorplanController: Entité invalide dans availableEntities:', entity);
            return;
          }
          
          const option = document.createElement('option');
          option.value = entity.entity_id;
          
          // Trouver le nom de l'entité depuis le state pour l'affichage
          const entityState = initialData.states ? initialData.states[entity.entity_id] : null;
          const entityDisplayName = entityState 
            ? entityState.attributes.friendly_name 
              || entityState.attributes.name 
              || entity.name 
            : entity.name;
          
          option.textContent = entityDisplayName || entity.entity_id;
          entitySelect.appendChild(option);
          
          console.log('[TRACE] FloorplanController: 📋 Chargement entité:', 
                      'ID:', entity.entity_id, 
                      '| Nom:', entityDisplayName || entity.entity_id, 
                      '| Valeur:', option.value, 
                      '| Texte:', option.textContent);
        });
        
        // Vérifier le nombre d'options dans la combobox
        console.log('[TRACE] FloorplanController: Nombre d\'options dans entitySelect:', entitySelect.options.length);
        
        if (availableEntities.length > 0) {
          console.log('[TRACE] FloorplanController: Préparation affichage combobox entités');
          console.log('[TRACE] FloorplanController: Style actuel:', entitySelect.style.display);
          
          entitySelect.style.display = 'block';
          console.log('[TRACE] FloorplanController: Style après modification:', entitySelect.style.display);
          console.log('[TRACE] FloorplanController: Visible dans DOM:', entitySelect.offsetParent !== null);
          console.log('[TRACE] FloorplanController: Combobox parent:', comboboxContainer.style.display);
          
          // Forcer le reflow
          entitySelect.style.display = 'none';
          void entitySelect.offsetHeight; // Trigger reflow
          entitySelect.style.display = 'block';
          
          console.log('[TRACE] FloorplanController: Affichage de la combobox des entités (forcé)');
          
          // Ajouter un bouton de confirmation
          const confirmButton = document.createElement('button');
          confirmButton.id = 'confirm-entity-selection';
          confirmButton.className = 'confirm-button';
          confirmButton.style.width = '100%';
          confirmButton.style.padding = '10px';
          confirmButton.style.marginTop = '10px';
          confirmButton.style.backgroundColor = '#4CAF50';
          confirmButton.style.color = 'white';
          confirmButton.style.border = 'none';
          confirmButton.style.borderRadius = '4px';
          confirmButton.style.cursor = 'pointer';
          confirmButton.style.fontWeight = 'bold';
          confirmButton.textContent = '📍 Ajouter l\'entité sélectionnée au plan';
          confirmButton.disabled = true;
          
          comboboxContainer.appendChild(confirmButton);
          
          // Activer/désactiver le bouton en fonction de la sélection
          entitySelect.addEventListener('change', () => {
            confirmButton.disabled = !entitySelect.value;
          });
          
          // Gestion du clic sur le bouton de confirmation
          confirmButton.addEventListener('click', () => {
            const selectedEntity_id = entitySelect.value;
            if (selectedEntity_id) {
              console.log('[TRACE] FloorplanController: Bouton confirmé pour entité:', selectedEntity_id);
              
              // Trouver le nom de l'entité pour la confirmation
              const selectedEntity = availableEntities.find(e => e.entity_id === selectedEntity_id);
              const entityState = initialData.states ? initialData.states[selectedEntity_id] : null;
              const entityDisplayName = entityState 
                ? entityState.attributes.friendly_name 
                  || entityState.attributes.name 
                  || (selectedEntity ? selectedEntity.name : selectedEntity_id)
                : (selectedEntity ? selectedEntity.name : selectedEntity_id);
              
              console.log('[TRACE] FloorplanController: Ajout de l\'entité:', areaNameForTrace, '->', deviceNameForTrace, '->', entityDisplayName || selectedEntity_id);
              
              // Ajouter l'entité au plan avec des traces détaillées
              console.log('[TRACE] FloorplanController: Appel à addEntity avec ID:', selectedEntity_id);
              const addResult = this.addEntity(selectedEntity_id);
              console.log('[TRACE] FloorplanController: Résultat de addEntity:', addResult);
              
              // Vérifier que l'entité a été ajoutée au state
              const updatedState = this.stateManager.getState();
              const entityInState = updatedState.objects.find(obj => obj.entity_id === selectedEntity_id);
              console.log('[TRACE] FloorplanController: Entité dans le state après ajout:', entityInState);
              
              this.closeMenu();
              
              // Nettoyer les combobox pour la prochaine utilisation
              areaSelect.value = '';
              deviceSelect.style.display = 'none';
              entitySelect.style.display = 'none';
              comboboxContainer.removeChild(confirmButton);
              
              // Réinitialiser les combobox
              deviceSelect.innerHTML = '';
              deviceSelect.appendChild(deviceDefaultOption.cloneNode(true));
              entitySelect.innerHTML = '';
              entitySelect.appendChild(entityDefaultOption.cloneNode(true));
            }
          });
        } else {
          entitySelect.style.display = 'none';
          console.log('[TRACE] FloorplanController: Aucune entité disponible pour ce device');
        }
      });
      
      // Gestion de la sélection d'entité
      entitySelect.addEventListener('change', (e) => {
        const selectedEntity_id = (e.target as HTMLSelectElement).value;
        
        if (!selectedEntity_id) {
          return;
        }
        
        console.log('[TRACE] FloorplanController: Entité sélectionnée:', selectedEntity_id);
        
        // Ajouter l'entité au centre du plan
        this.addEntity(selectedEntity_id);
        this.closeMenu();
        
        // Réinitialiser les combobox pour la prochaine utilisation
        areaSelect.value = '';
        deviceSelect.style.display = 'none';
        entitySelect.style.display = 'none';
        deviceSelect.innerHTML = '';
        deviceSelect.appendChild(deviceDefaultOption.cloneNode(true));
        entitySelect.innerHTML = '';
        entitySelect.appendChild(entityDefaultOption.cloneNode(true));
      });
      
      console.log('[TRACE] FloorplanController: Interface de sélection d\'entités avec combobox en cascade créée');

    } else {
      // Menu en mode normal
      const menuTitle = document.getElementById('menu-title')!;
      menuTitle.textContent = 'Menu Principal';

      // Option pour entrer en mode paramétrage
      const parametrageItem = document.createElement('div');
      parametrageItem.className = 'menu-item';
      parametrageItem.innerHTML = '<i class="fas fa-cog"></i> Mode Paramétrage';
      parametrageItem.addEventListener('click', () => {
        this.stateManager.enterParametrageMode();
        this.closeMenu();
      });
      menuContent.appendChild(parametrageItem);

      // Option pour upload un plan
      const uploadItem = document.createElement('div');
      uploadItem.className = 'menu-item';
      uploadItem.innerHTML = '<i class="fas fa-upload"></i> Upload un plan';
      uploadItem.addEventListener('click', () => {
        this.handleUploadClick();
        this.closeMenu();
      });
      menuContent.appendChild(uploadItem);

      // Option pour rafraîchir les données
      const refreshItem = document.createElement('div');
      refreshItem.className = 'menu-item';
      refreshItem.innerHTML = '<i class="fas fa-sync"></i> Rafraîchir les données';
      refreshItem.addEventListener('click', () => {
        this.refreshData();
        this.closeMenu();
      });
      menuContent.appendChild(refreshItem);
    }
  }

  private toggleMenu(): void {
    const menu = document.getElementById('context-menu')!;
    menu.classList.toggle('masque');
  }

  private closeMenu(): void {
    const menu = document.getElementById('context-menu')!;
    menu.classList.add('masque');
  }

  private handleUploadClick(): void {
    const input = document.getElementById('floorplan-upload-input') as HTMLInputElement;
    input.click();

    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await this.handleFileUpload(file);
        input.value = ''; // Réinitialiser l'input
      }
    }, { once: true });
  }

  private async handleFileUpload(file: File): Promise<void> {
    try {
      // Afficher le chargement
      this.showLoading('Upload du plan en cours...');

      // Upload du fichier
      const floorplan = await this.apiService.uploadFloorplan(file);

      // Afficher le nouveau plan
      this.floorplanRenderer.renderPlan(floorplan.path!);

      // Mettre à jour l'état
      this.stateManager.onFloorplanUploaded();

      // Rafraîchissement automatique après 2 secondes comme spécifié
      console.log('Scheduling automatic refresh in 2 seconds...');
      setTimeout(async () => {
        try {
          console.log('Performing automatic refresh...');
          await this.refreshData();
          console.log('Refresh completed successfully');
        } catch (error) {
          console.error('Refresh failed:', error);
        }
      }, 2000);

      this.showSuccess('Plan téléversé avec succès');
    } catch (error) {
      console.error('Upload failed:', error);
      this.showError('Échec de l\'upload du plan');
    } finally {
      // Masquer le chargement
      this.hideLoading();
    }
  }

  private async refreshData(): Promise<void> {
    try {
      // Suspendre l'affichage du spinner pour l'instant
      console.log('Début du rafraîchissement des données (sans spinner)...');
      
      await this.apiService.refreshData();
      console.log('Rafraîchissement des données terminé.');
      // Ne pas afficher de notification de succès pour le rafraîchissement
    } catch (error) {
      console.error('Refresh failed:', error);
      this.showError('Échec du rafraîchissement');
    }
  }

  private addEntity(entity_id: string): any {
    console.log('[TRACE] FloorplanController: Début de addEntity pour:', entity_id);
    
    if (this.stateManager.getState().mode !== 'parametrage') {
      console.warn('[TRACE] FloorplanController: addEntity annulé - pas en mode paramétrage');
      this.showError('L\'ajout d\'entités est uniquement possible en mode paramétrage');
      return { success: false, reason: 'not_in_parametrage_mode' };
    }

    // Créer un nouvel objet au centre du plan
    const objectType = this.determineObjectType(entity_id);
    console.log('[TRACE] FloorplanController: Type déterminé:', objectType);

    const newObject: FloorplanObject = {
      entity_id: entity_id,
      type: objectType,
      position: { x: 0.5, y: 0.5 }
    };

    console.log('[TRACE] FloorplanController: Nouveau objet créé:', newObject);

    // Ajouter à l'état
    console.log('[TRACE] FloorplanController: Ajout à l\'état...');
    this.stateManager.addObject(newObject);
    console.log('[TRACE] FloorplanController: Objet ajouté à l\'état');

    // Ajouter au renderer
    console.log('[TRACE] FloorplanController: Ajout au renderer...');
    try {
      this.floorplanRenderer.addObject(newObject);
      console.log('[TRACE] FloorplanController: Objet ajouté au renderer');
    } catch (error) {
      console.error('[TRACE] FloorplanController: Erreur lors de l\'ajout au renderer:', error);
      return { success: false, reason: 'renderer_error', error: error };
    }

    console.log('[TRACE] FloorplanController: addEntity terminé avec succès');
    this.showSuccess(`Entité ${entity_id} ajoutée`);
    
    return { success: true, object: newObject };
  }

  private determineObjectType(entity_id: string): any {
    // Logique simplifiée - à améliorer
    if (entity_id.startsWith('light.')) {
      return entity_id.includes('brightness') ? 'light-brightness' : 'light';
    } else if (entity_id.startsWith('cover.')) {
      return entity_id.includes('vertical') ? 'cover-vertical' : 'cover-horizontal';
    } else if (entity_id.startsWith('climate.')) {
      return 'thermostat';
    }
    return 'sensor';
  }

  private restorePositions(positions: any): void {
    // Restaurer les positions des objets
    positions.objects.forEach((obj: FloorplanObject) => {
      this.stateManager.addObject(obj);
      this.floorplanRenderer.addObject(obj);
    });
  }

  // Gestion des mises à jour WebSocket
  private handleTreeUpdate(data: any): void {
    // Mettre à jour l'arborescence et les entités disponibles
    const allEntities = data.flatMap((area: any) =>
      area.devices.flatMap((device: any) => device.entities)
    );
    this.stateManager.updateAvailableEntities(allEntities);
  }

  private handleStateUpdate(state: HAState): void {
    // Mettre à jour l'état d'un objet
    this.stateManager.updateStateForEntity(state.entity_id, state);
    this.floorplanRenderer.updateObjectState(state.entity_id, state);
  }

  private handleConfigUpdate(data: any): void {
    // Mettre à jour la configuration
    if (data.positions) {
      this.restorePositions(data.positions);
    }
  }

  private handleFloorplanUpdate(data: any): void {
    // Mettre à jour le plan
    if (data.path) {
      this.floorplanRenderer.renderPlan(data.path);
      this.stateManager.updateState({ hasFloorplan: true });
    }
  }

  // Utilitaires d'interface
  private showLoading(message: string): void {
    // Fonction suspendue temporairement - ne fait rien
    // console.log('FloorplanController: showLoading called with message:', message);
    // const loading = document.getElementById('loading-indicator')!;
    // if (loading) {
    //   loading.querySelector('p')!.textContent = message;
    //   loading.classList.remove('hidden');
    // } else {
    //   console.error('FloorplanController: Loading element not found');
    // }
  }

  private hideLoading(): void {
    // Fonction suspendue temporairement - ne fait rien
    // console.log('FloorplanController: hideLoading called');
    // const loading = document.getElementById('loading-indicator')!;
    // if (loading) {
    //   loading.classList.add('hidden');
    // } else {
    //   console.error('FloorplanController: Loading element not found');
    // }
  }

  private showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  private showError(message: string): void {
    this.showNotification(message, 'error');
  }

  private showNotification(message: string, type: string): void {
    const container = document.getElementById('notification-container')!;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialisation de l'application
new FloorplanController();
