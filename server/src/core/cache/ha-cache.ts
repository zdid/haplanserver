class HACache<T> {
  private data: T | null = null;
  private lastUpdated: Date | null = null;
  private ttl: number;

  constructor(ttl: number = 300000) {
    this.ttl = ttl;
  }

  set(data: T): void {
    this.data = data;
    this.lastUpdated = new Date();
  }

  get(): T | null {
    if (!this.data || !this.lastUpdated) {
      return null;
    }
    const now = new Date();
    if (now.getTime() - this.lastUpdated.getTime() > this.ttl) {
      return null;
    }
    return this.data;
  }

  clear(): void {
    this.data = null;
    this.lastUpdated = null;
  }

  isValid(): boolean {
    return this.get() !== null;
  }
}

export default HACache;