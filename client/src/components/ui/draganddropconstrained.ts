/**
 * Classe pour gérer le drag and drop d'un élément avec des contraintes de mouvement.
 * L'élément ne peut pas sortir d'une zone définie (par défaut, son conteneur parent).
 */
export class DragAndDropConstrained {
  private element: HTMLElement;
  private container: HTMLElement;
  private isDragging: boolean = false;
  private offsetX: number = 0;
  private offsetY: number = 0;

  /**
   * @param elementSelector - Sélecteur CSS de l'élément à rendre "draggable".
   * @param containerSelector - Sélecteur CSS du conteneur qui limite la zone de mouvement.
   *                           Par défaut, le parent direct de l'élément.
   */
  constructor(
    elementSelector: string,
    containerSelector?: string
  ) {
    this.element = document.querySelector<HTMLElement>(elementSelector)!;
    if (!this.element) {
      throw new Error(`Élément introuvable avec le sélecteur : ${elementSelector}`);
    }

    // Si aucun conteneur n'est spécifié, utilise le parent direct
    this.container = containerSelector
      ? document.querySelector<HTMLElement>(containerSelector)!
      : this.element.parentElement!;

    if (!this.container) {
      throw new Error("Conteneur introuvable.");
    }

    // Initialise les événements
    this.init();
  }

  /**
   * Initialise les écouteurs d'événements pour le drag and drop.
   */
  private init(): void {
    this.element.style.position = "absolute";
    this.element.style.cursor = "move";
    this.element.style.userSelect = "none";

    this.element.addEventListener("mousedown", this.startDrag);
    document.addEventListener("mousemove", this.drag);
    document.addEventListener("mouseup", this.endDrag);
  }

  /**
   * Début du glisser : calcule les offsets et active le mode "dragging".
   * @param event - Événement de souris.
   */
  private startDrag = (event: MouseEvent): void => {
    event.preventDefault();
    this.isDragging = true;

    // Calcule les offsets entre la souris et le coin supérieur gauche de l'élément
    const rect = this.element.getBoundingClientRect();
    this.offsetX = event.clientX - rect.left;
    this.offsetY = event.clientY - rect.top;
  };

  /**
   * Pendant le glisser : déplace l'élément en respectant les contraintes du conteneur.
   * @param event - Événement de souris.
   */
  private drag = (event: MouseEvent): void => {
    if (!this.isDragging) return;

    // Calcule les nouvelles coordonnées de l'élément
    let newX = event.clientX - this.offsetX;
    let newY = event.clientY - this.offsetY;

    // Récupère les dimensions du conteneur et de l'élément
    const containerRect = this.container.getBoundingClientRect();
    const elementRect = this.element.getBoundingClientRect();

    // Contraintes pour ne pas sortir du conteneur
    newX = Math.max(containerRect.left, Math.min(newX, containerRect.right - elementRect.width));
    newY = Math.max(containerRect.top, Math.min(newY, containerRect.bottom - elementRect.height));

    // Applique les nouvelles coordonnées
    this.element.style.left = `${newX - containerRect.left}px`;
    this.element.style.top = `${newY - containerRect.top}px`;
  };

  /**
   * Fin du glisser : désactive le mode "dragging".
   */
  private endDrag = (): void => {
    this.isDragging = false;
  };

  /**
   * Nettoie les écouteurs d'événements (à appeler si la classe est détruite).
   */
  public destroy(): void {
    this.element.removeEventListener("mousedown", this.startDrag);
    document.removeEventListener("mousemove", this.drag);
    document.removeEventListener("mouseup", this.endDrag);
  }
}
