import { PositionCalculator } from '../../core/services/position-calculator';
import { FloorplanObject } from '../../core/types/client-types';
import { HAState } from '../../core/types/ha-types';
import { DragAndDropConstrained } from '../../ui/draganddropconstrained';

export class FloorplanRenderer {
  private container: HTMLElement;
  private planElement: HTMLImageElement;
  private objectContainer: HTMLElement;
  private objects: FloorplanObject[] = [];
  private currentPlanSize: { width: number; height: number } = { width: 0, height: 0 };
  private naturalWidth: number = 0;
  private naturalHeight: number = 0;
  private aspectRatio: number = 1;
  private initialData: any = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.planElement = document.createElement('img');
    this.planElement.id = 'floorplan-image';
    this.planElement.className = 'floorplan';

    // Créer une structure propre avec le plan en premier
    this.container.appendChild(this.planElement);
    
    // Utiliser le conteneur d'objets existant ou en créer un nouveau
    this.objectContainer = document.getElementById('object-container') as HTMLElement;
    
    if (!this.objectContainer) {
      this.objectContainer = document.createElement('div');
      this.objectContainer.id = 'object-container';
      this.objectContainer.className = 'object-container';
      this.container.appendChild(this.objectContainer);
    }
    
    // Ajouter la poubelle dans le conteneur d'objets
    const trashIcon = document.getElementById('trash-icon');
    if (trashIcon && !this.objectContainer.contains(trashIcon)) {
      this.objectContainer.appendChild(trashIcon);
    }

    this.setupResizeObserver();
  }

  private setupResizeObserver(): void {
    const observer = new ResizeObserver(entries => {
      this.resizeToFitContainer();
    });
    observer.observe(this.container);
  }

  renderPlan(imagePath: string): void {
    console.log('FloorplanRenderer: Loading plan from', imagePath);
    
    // Réinitialiser les dimensions
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.aspectRatio = 1;
    
    this.planElement.src = imagePath;
    
    this.planElement.onload = () => {
      console.log('FloorplanRenderer: Plan loaded successfully');
      
      // Stocker les dimensions naturelles
      this.naturalWidth = this.planElement.naturalWidth;
      this.naturalHeight = this.planElement.naturalHeight;
      this.aspectRatio = this.naturalWidth / this.naturalHeight;
      
      console.log(`FloorplanRenderer: Plan dimensions - ${this.naturalWidth}x${this.naturalHeight} (ratio: ${this.aspectRatio})`);
      
      // Appliquer les proportions au conteneur
      const wrapper = document.getElementById('floorplan-wrapper');
      if (wrapper) {
        wrapper.style.aspectRatio = this.aspectRatio.toString();
      }
      
      this.resizeToFitContainer();
    };
    
    this.planElement.onerror = () => {
      console.error('FloorplanRenderer: Failed to load plan image from', imagePath);
      this.planElement.style.display = 'none';
    };
  }

  private resizeToFitContainer(): void {
    const containerRect = this.container.getBoundingClientRect();
    const planRect = this.planElement.getBoundingClientRect();

    if (planRect.width === 0 || planRect.height === 0) return;

    // Calcul du ratio
    const planRatio = planRect.width / planRect.height;
    const containerRatio = containerRect.width / containerRect.height;

    let width, height;

    if (planRatio > containerRatio) {
      // Plan plus large que le conteneur
      width = containerRect.width;
      height = width / planRatio;
    } else {
      // Plan plus haut que le conteneur
      height = containerRect.height;
      width = height * planRatio;
    }

    // Application des dimensions
    this.planElement.style.width = `${width}px`;
    this.planElement.style.height = `${height}px`;
    this.objectContainer.style.width = `${width}px`;
    this.objectContainer.style.height = `${height}px`;
    
    // Calculer la position du conteneur d'objets pour qu'il corresponde à l'image du plan
    const planElementRect = this.planElement.getBoundingClientRect();
    const parentContainerRect = this.container.getBoundingClientRect();
    
    // Calculer la position centrée de l'image dans son conteneur
    const planLeft = (parentContainerRect.width - planElementRect.width) / 2;
    const planTop = (parentContainerRect.height - planElementRect.height) / 2;
    
    // Positionner le conteneur d'objets aux mêmes coordonnées que l'image
    this.objectContainer.style.position = 'absolute';
    this.objectContainer.style.left = `${planLeft}px`;
    this.objectContainer.style.top = `${planTop}px`;

    this.currentPlanSize = { width, height };

    console.log('[TRACE] FloorplanRenderer: Redimensionnement terminé', {
      containerSize: { width: parentContainerRect.width, height: parentContainerRect.height },
      planSize: { width, height },
      planPosition: { left: planLeft, top: planTop },
      objectContainerSize: { width: this.objectContainer.offsetWidth, height: this.objectContainer.offsetHeight },
      objectContainerPosition: { left: this.objectContainer.style.left, top: this.objectContainer.style.top }
    });

    // Repositionnement des objets
    this.updateAllObjectPositions();
  }

  addObject(object: FloorplanObject): void {
    console.log('[TRACE] FloorplanRenderer: addObject appelé avec:', object);
    console.log('[TRACE] FloorplanRenderer: Plan chargé:', this.planElement.src);
    console.log('[TRACE] FloorplanRenderer: Taille du plan:', this.currentPlanSize);
    console.log('[TRACE] FloorplanRenderer: Conteneur d\'objets:', this.objectContainer);
    
    this.objects.push(object);
    console.log('[TRACE] FloorplanRenderer: Objet ajouté à la liste, total:', this.objects.length);
    
    const element = this.createObjectElement(object);
    console.log('[TRACE] FloorplanRenderer: Élément créé:', element);
    
    this.objectContainer.appendChild(element);
    console.log('[TRACE] FloorplanRenderer: Élément ajouté au DOM');
    console.log('[TRACE] FloorplanRenderer: Parent de l\'élément:', element.parentNode);
    
    this.positionObject(element, object.position);
    console.log('[TRACE] FloorplanRenderer: Élément positionné à:', object.position);
    console.log('[TRACE] FloorplanRenderer: Style final:', element.style.left, element.style.top);
  }

  private createObjectElement(object: FloorplanObject): HTMLElement {
    const element = document.createElement('div');
    element.className = `ha-object ${object.type}`;
    element.id = `obj-${object.entity_id}`;
    element.dataset.entity_id = object.entity_id;
    
    // Style pour s'assurer que l'élément est visible et sélectionnable
    element.style.position = 'absolute';
    element.style.userSelect = 'none';
    element.style.zIndex = '10';
    
    // Ajouter le contenu en fonction du type
    this.renderObjectContent(element, object);

    // Utiliser le nouveau composant de drag-and-drop
    if (this.stateManager.getState().mode === 'parametrage') {
      new DragAndDropConstrained(`#obj-${object.entity_id}`, '#floorplan-wrapper');
    }

    return element;
  }

  private renderObjectContent(element: HTMLElement, object: FloorplanObject): void {
    switch (object.type) {
      case 'light':
        this.renderLight(element, object);
        break;
      case 'light-brightness':
        this.renderLightWithBrightness(element, object);
        break;
      case 'cover-vertical':
        this.renderVerticalCover(element, object);
        break;
      case 'cover-horizontal':
        this.renderHorizontalCover(element, object);
        break;
      case 'thermostat':
        this.renderThermostat(element, object);
        break;
      default:
        this.renderSensor(element, object);
    }
  }

  private renderLight(element: HTMLElement, object: FloorplanObject): void {
    element.innerHTML = '<i class="ha-icon lightbulb"></i>';
    element.classList.add('light');
  }

  private renderLightWithBrightness(element: HTMLElement, object: FloorplanObject): void {
    element.innerHTML = `
      <i class="ha-icon lightbulb"></i>
      <div class="brightness-controls">
        <button class="brightness-btn minus">-</button>
        <button class="brightness-btn plus">+</button>
      </div>
    `;
    element.classList.add('light', 'with-brightness');
  }

  private renderVerticalCover(element: HTMLElement, object: FloorplanObject): void {
    element.innerHTML = `
      <div class="cover-percentage">50%</div>
      <div class="cover-controls">
        <button class="cover-btn up">▲</button>
        <button class="cover-btn stop">■</button>
        <button class="cover-btn down">▼</button>
      </div>
    `;
    element.classList.add('cover', 'vertical');
  }

  private renderHorizontalCover(element: HTMLElement, object: FloorplanObject): void {
    element.innerHTML = `
      <div class="cover-percentage">50%</div>
      <div class="cover-controls">
        <button class="cover-btn left">◄</button>
        <button class="cover-btn stop">■</button>
        <button class="cover-btn right">►</button>
      </div>
    `;
    element.classList.add('cover', 'horizontal');
  }

  private renderThermostat(element: HTMLElement, object: FloorplanObject): void {
    element.innerHTML = `
      <button class="thermostat-btn minus">-</button>
      <div class="thermostat-value">20°C</div>
      <button class="thermostat-btn plus">+</button>
    `;
    element.classList.add('thermostat');
  }

  private renderSensor(element: HTMLElement, object: FloorplanObject): void {
    // Créer l'élément de valeur
    const valueElement = document.createElement('div');
    valueElement.className = 'sensor-value';
    
    // Obtenir la valeur depuis le state ou utiliser '-' par défaut
    const entityState = this.initialData?.states?.[object.entity_id];
    const displayValue = entityState?.state || '-';
    valueElement.textContent = displayValue;
    
    // Calculer la largeur en fonction de la longueur du texte
    const textLength = displayValue.toString().length;
    const width = Math.max(20, textLength * 8 + 2); // 8px par caractère + 2px de marge
    valueElement.style.width = `${width}px`;
    valueElement.style.display = 'inline-block';
    
    element.appendChild(valueElement);
    element.classList.add('sensor');
    
    console.log('[TRACE] FloorplanRenderer: Sensor rendu:', {
      entity_id: object.entity_id,
      displayValue,
      textLength,
      width
    });
  }

  private setupDragAndDrop(element: HTMLElement, object: FloorplanObject): void {
    // Vérifier si on est en mode paramétrage
    const isParametrageMode = document.getElementById('mode-indicator')?.classList.contains('parametrage');
    
    console.log('[TRACE] FloorplanRenderer: setupDragAndDrop appelé pour', object.entity_id, 
                '| Mode paramétrage:', isParametrageMode);
    
    if (!isParametrageMode) {
      console.log('[TRACE] FloorplanRenderer: Drag-and-drop désactivé - pas en mode paramétrage');
      // Réinitialiser le curseur
      element.style.cursor = '';
      return;
    }

    // Ajouter le curseur de déplacement
    element.style.cursor = 'move';

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    element.addEventListener('mousedown', (e) => {
      console.log('[TRACE] FloorplanRenderer: mousedown sur', object.entity_id);
      
      if (e.button !== 0) {
        console.log('[TRACE] FloorplanRenderer: Bouton droit - ignoré');
        return; // Bouton gauche uniquement
      }

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      element.style.zIndex = '100';
      e.preventDefault();
      
      console.log('[TRACE] FloorplanRenderer: Drag-and-drop démarré pour', object.entity_id);
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) {
        console.log('[TRACE] FloorplanRenderer: mousemove mais pas en drag');
        return;
      }

      console.log('[TRACE] FloorplanRenderer: mousemove en cours pour', object.entity_id);

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const newLeft = startLeft + dx;
      const newTop = startTop + dy;

      // Calculer la position relative au plan
      const planRect = this.planElement.getBoundingClientRect();
      const relativePos = PositionCalculator.toRelative(
        { x: newLeft + element.offsetWidth / 2, y: newTop + element.offsetHeight / 2 },
        this.currentPlanSize
      );

      // Mettre à jour la position de l'objet
      object.position = PositionCalculator.constrain(relativePos);
      
      console.log('[TRACE] FloorplanRenderer: Nouvelle position calculée', {
        dx, dy, newLeft, newTop, relativePos
      });

      // Appliquer la position
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;

      e.preventDefault();
    });

    document.addEventListener('mouseup', (e) => {
      if (!isDragging) return;

      isDragging = false;
      element.style.zIndex = '';

      // Vérifier si on est sur la poubelle
      const trashIcon = document.getElementById('trash-icon');
      if (trashIcon) {
        const trashRect = trashIcon.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        if (this.isOverlapping(elementRect, trashRect)) {
          this.removeObject(object.entity_id);
          return;
        }
      }

      // Mettre à jour la position finale
      this.positionObject(element, object.position);

      e.preventDefault();
    });
  }

  private isOverlapping(rect1: DOMRect, rect2: DOMRect): boolean {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  }

  setInitialData(data: any): void {
    this.initialData = data;
    console.log('[TRACE] FloorplanRenderer: Données initiales définies');
  }

  private positionObject(element: HTMLElement, position: { x: number; y: number }): void {
    // Obtenir la position et les dimensions du plan
    const planRect = this.planElement.getBoundingClientRect();
    const objectContainerRect = this.objectContainer.getBoundingClientRect();
    
    console.log('[TRACE] FloorplanRenderer: Positionnement avec:', {
      position,
      planPosition: { left: planRect.left, top: planRect.top },
      planSize: { width: planRect.width, height: planRect.height },
      objectContainerPosition: { left: objectContainerRect.left, top: objectContainerRect.top }
    });

    // Calculer la position absolue en fonction des dimensions du plan
    const absolutePos = PositionCalculator.toAbsolute(position, {
      width: planRect.width,
      height: planRect.height
    });

    // Centrage de l'objet avec une taille par défaut si nécessaire
    const elementWidth = element.offsetWidth || 50;
    const elementHeight = element.offsetHeight || 50;
    
    // Calculer la position finale en fonction de la position du conteneur d'objets
    // La position du conteneur est déjà absolue, donc nous ajoutons simplement la position relative
    const finalLeft = absolutePos.x - elementWidth / 2;
    const finalTop = absolutePos.y - elementHeight / 2;
    
    console.log('[TRACE] FloorplanRenderer: Calculs de position:', {
      absolutePos,
      elementWidth,
      elementHeight,
      objectContainerOffset: { left: objectContainerRect.left, top: objectContainerRect.top },
      finalLeft,
      finalTop
    });

    // Appliquer la position avec position absolute
    element.style.position = 'absolute';
    element.style.left = `${finalLeft}px`;
    element.style.top = `${finalTop}px`;
    
    console.log('[TRACE] FloorplanRenderer: Position finale appliquée:', {
      left: element.style.left,
      top: element.style.top,
      position: element.style.position
    });
  }

  private updateAllObjectPositions(): void {
    this.objects.forEach(object => {
      const element = document.getElementById(`obj-${object.entity_id}`);
      if (element) {
        this.positionObject(element, object.position);
      }
    });
  }

  removeObject(entity_id: string): void {
    const index = this.objects.findIndex(obj => obj.entity_id === entity_id);
    if (index !== -1) {
      this.objects.splice(index, 1);
      const element = document.getElementById(`obj-${entity_id}`);
      if (element) {
        element.remove();
      }
    }
  }

  updateObjectState(entity_id: string, state: HAState): void {
    const element = document.getElementById(`obj-${entity_id}`);
    if (!element) return;

    const object = this.objects.find(obj => obj.entity_id === entity_id);
    if (!object) return;

    switch (object.type) {
      case 'light':
        this.updateLightState(element, state);
        break;
      case 'light-brightness':
        this.updateLightWithBrightnessState(element, state);
        break;
      case 'cover-vertical':
      case 'cover-horizontal':
        this.updateCoverState(element, state);
        break;
      case 'thermostat':
        this.updateThermostatState(element, state);
        break;
      default:
        this.updateSensorState(element, state);
    }
  }

  private updateLightState(element: HTMLElement, state: HAState): void {
    element.classList.toggle('on', state.state === 'on');
    element.classList.toggle('off', state.state === 'off');
  }

  private updateLightWithBrightnessState(element: HTMLElement, state: HAState): void {
    this.updateLightState(element, state);
    const brightnessValue = element.querySelector('.brightness-value');
    if (brightnessValue) {
      brightnessValue.textContent = state.attributes.brightness?.toString() || '0';
    }
  }

  private updateCoverState(element: HTMLElement, state: HAState): void {
    const percentage = element.querySelector('.cover-percentage');
    if (percentage) {
      percentage.textContent = `${state.attributes.current_position || 0}%`;
    }
  }

  private updateThermostatState(element: HTMLElement, state: HAState): void {
    const value = element.querySelector('.thermostat-value');
    if (value) {
      value.textContent = `${state.attributes.temperature || 0}°C`;
    }
  }

  private updateSensorState(element: HTMLElement, state: HAState): void {
    const value = element.querySelector('.sensor-value');
    if (value) {
      value.textContent = state.state;
      if (state.attributes.unit_of_measurement) {
        value.textContent += ` ${state.attributes.unit_of_measurement}`;
      }
    }
  }
}
