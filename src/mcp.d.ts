declare module '@modelcontextprotocol/sdk/server/index.js' {
  export class Server {
    constructor(
      info: { name: string; version: string },
      config: {
        capabilities: {
          tools?: Record<string, {
            description: string;
            inputSchema: {
              type: string;
              properties: Record<string, any>;
              required: string[];
            };
          }>;
        };
      }
    );

    setRequestHandler(
      name: string,
      handler: (request: any) => Promise<any>
    ): void;

    connect(transport: any): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export const ListToolsRequestSchema = 'list_tools';
  export const CallToolRequestSchema = 'call_tool';
} 