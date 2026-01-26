class Logger {
  private static instance: Logger;
  private logLevel: string;

  private constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  public info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  public error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  public debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
}

export default Logger.getInstance();