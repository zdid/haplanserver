import { createConnection, createLongLivedTokenAuth } from "home-assistant-js-websocket";
const wnd = globalThis;
wnd.WebSocket = require('ws');

class HAConnection {
  private connection: any;
  private config: any;
  

  constructor(config: any) {
    this.config = config;
    console.log('[TRACE] HAConnection: Initialisation avec URL:', config.url);
    console.log('[TRACE] HAConnection: Clé API:', config.apiKey ? '****' : 'non définie');
  }

  async connect(): Promise<void> {
    const auth =  await createLongLivedTokenAuth(
      this.config.url,
      this.config.apiKey,
   );
   try {
      // @ts-ignore
      this.connection = await createConnection({ auth });

      console.log(`Connecté à Home Assistant à ${this.config.url}`);
   } catch (error) {
      console.error("Échec de connexion à Home Assistant:", error);
      throw error;
   }
  }

  getConnection(): any {
    return this.connection;
  }
}

export default HAConnection;
