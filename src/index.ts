import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';
import { getApiKeys, loadApiKeys, validateApiKeys } from './config.js';
import { ContentFetcher } from './content-fetcher.js';
import { SearchResult, WebpageAnalysisResponse, WebpageContent } from './types.js';

// ツール定義
const TOOLS_DEFINITION = [
    {
        name: "google_search",
        description: "Search Google and return relevant results from the web. Results include titles, snippets, and URLs.",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query - be specific and use quotes for exact matches."
                },
                num_results: {
                    type: "number",
                    description: "Number of results to return (default: 5, max: 10)."
                },
                date_restrict: {
                    type: "string",
                    description: "Restrict results to a specific time period. Format: [d|w|m|y][number] e.g., \"d1\" (past day), \"w2\" (past 2 weeks), \"m3\" (past 3 months), \"y1\" (past year)."
                },
                language: {
                    type: "string",
                    description: "Restrict results to a specific language using ISO 639-1 codes. Examples: \"en\" (English), \"es\" (Spanish), \"fr\" (French), \"de\" (German), \"ja\" (Japanese)."
                },
                country: {
                    type: "string",
                    description: "Restrict results to a specific country using ISO 3166-1 alpha-2 codes. Examples: \"us\" (United States), \"uk\" (United Kingdom), \"ca\" (Canada), \"au\" (Australia)."
                },
                safe_search: {
                    type: "string",
                    enum: ["off", "medium", "high"],
                    description: "Safe search level: \"off\" (no filtering), \"medium\" (moderate filtering), \"high\" (strict filtering)."
                }
            },
            required: ["query"]
        }
    },
    {
        name: "extract_webpage_content",
        description: "Extract and analyze content from a webpage, converting it to readable text. This tool fetches the main content while removing ads, navigation elements, and other clutter.",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "Full URL of the webpage to extract content from (must start with http:// or https://)."
                }
            },
            required: ["url"]
        }
    },
    {
        name: "extract_multiple_webpages",
        description: "Extract and analyze content from multiple webpages in a single request. Limited to 5 URLs per request to maintain performance.",
        inputSchema: {
            type: "object",
            properties: {
                urls: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of webpage URLs to extract content from. Each URL must be public and start with http:// or https://. Maximum 5 URLs per request."
                }
            },
            required: ["urls"]
        }
    }
];

// ツール定義をオブジェクト形式に変換
const TOOLS_CAPABILITIES = TOOLS_DEFINITION.reduce((acc, tool) => {
    acc[tool.name] = {
        description: tool.description,
        inputSchema: tool.inputSchema
    };
    return acc;
}, {} as Record<string, any>);

// エラーハンドリング関数
function handleError(error: unknown, context: string = "操作"): { content: Array<{type: string, text: string}>, isError: boolean } {
    if (axios.isAxiosError(error) && error.response) {
        const errorInfo = error.response.data?.error || {};
        const errorCode = errorInfo.code || error.response.status;
        const errorMessage = errorInfo.message || error.message;
        const errorDetails = errorInfo.errors || [];

        let detailedError = `${context}に失敗しました (${errorCode}): ${errorMessage}\n${context} failed (${errorCode}): ${errorMessage}`;

        if (errorDetails.length > 0) {
            const details = `\n\n詳細:\n${errorDetails.map((e: any) => `- ${e.reason}: ${e.message}`).join('\n')}`;
            detailedError += details;
        }

        return {
            content: [{ type: "text", text: detailedError }],
            isError: true
        };
    }
    
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
        content: [{ type: "text", text: `${context}に失敗しました: ${errorMessage}\n${context} failed: ${errorMessage}` }],
        isError: true
    };
}

/**
 * Google検索およびウェブページ抽出機能を提供するサービスクラス
 */
export class GoogleSearchService {
    private contentFetcher: ContentFetcher;
    private server: Server | null = null;

    constructor() {
        this.contentFetcher = new ContentFetcher();
        loadApiKeys();

        if (!validateApiKeys()) {
            console.error('警告: APIキーが設定されていません。Google検索機能が動作しない可能性があります。');
            console.error('GOOGLE_API_KEY と GOOGLE_SEARCH_ENGINE_ID 環境変数を設定するか、api-keys.jsonファイルを作成してください。');
        }
    }

    /**
     * MCPサーバーを初期化して起動します
     */
    async startServer(): Promise<void> {
        this.server = new Server(
            {
                name: "google-search",
                version: "1.0.0"
            },
            {
                capabilities: {
                    tools: TOOLS_CAPABILITIES
                }
            }
        );

        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: TOOLS_DEFINITION
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
            switch (request.params.name) {
                case 'google_search':
                    if (typeof request.params.arguments === 'object' && request.params.arguments !== null && 'query' in request.params.arguments) {
                        const args = request.params.arguments;
                        return this.handleSearch({
                            query: String(args.query),
                            num_results: typeof args.num_results === 'number' ? args.num_results : undefined,
                            date_restrict: typeof args.date_restrict === 'string' ? args.date_restrict : undefined,
                            language: typeof args.language === 'string' ? args.language : undefined,
                            country: typeof args.country === 'string' ? args.country : undefined,
                            safe_search: typeof args.safe_search === 'string' ? args.safe_search : undefined
                        });
                    }
                    throw new Error('Invalid arguments for google_search tool');

                case 'extract_webpage_content':
                    if (typeof request.params.arguments === 'object' && request.params.arguments !== null && 'url' in request.params.arguments) {
                        return this.handleAnalyzeWebpage({
                            url: String(request.params.arguments.url)
                        });
                    }
                    throw new Error('Invalid arguments for extract_webpage_content tool');

                case 'extract_multiple_webpages':
                    if (typeof request.params.arguments === 'object' && request.params.arguments !== null &&
                        'urls' in request.params.arguments && Array.isArray(request.params.arguments.urls)) {
                        return this.handleBatchAnalyzeWebpages({
                            urls: request.params.arguments.urls.map(String)
                        });
                    }
                    throw new Error('Invalid arguments for extract_multiple_webpages tool');

                default:
                    throw new Error(`Unknown tool: ${request.params.name}`);
            }
        });

        try {
            const transport = new StdioServerTransport();
            await this.server.connect(transport);
            console.error('Google Search MCP server running with official MCP SDK');
        } catch (error) {
            console.error('Failed to start MCP server:', error);
            throw error;
        }
    }

    /**
     * Google検索を実行します
     */
    async search(query: string, numResults: number = 5, options?: {
        date_restrict?: string;
        language?: string;
        country?: string;
        safe_search?: string;
    }): Promise<SearchResult[]> {
        const result = await this.handleSearch({
            query,
            num_results: numResults,
            date_restrict: options?.date_restrict,
            language: options?.language,
            country: options?.country,
            safe_search: options?.safe_search
        });
        if ('isError' in result && result.isError) {
            throw new Error(result.content[0].text);
        }
        return JSON.parse(result.content[0].text);
    }

    /**
     * ウェブページの内容を抽出します
     */
    async extractWebpage(url: string): Promise<WebpageContent> {
        const result = await this.handleAnalyzeWebpage({ url });
        if ('isError' in result && result.isError) {
            throw new Error(result.content[0].text);
        }
        return JSON.parse(result.content[0].text);
    }

    /**
     * 複数のウェブページの内容を一括抽出します
     */
    async batchExtractWebpages(urls: string[]): Promise<WebpageAnalysisResponse> {
        const result = await this.handleBatchAnalyzeWebpages({ urls });
        if ('isError' in result && result.isError) {
            throw new Error(result.content[0].text);
        }
        return JSON.parse(result.content[0].text);
    }

    /**
     * 検索ハンドラー関数
     */
    private async handleSearch(args: { query: string; num_results?: number; date_restrict?: string; language?: string; country?: string; safe_search?: string }) {
        if (!args.query.trim()) {
            return {
                content: [{ type: "text", text: '検索クエリが空です。具体的なキーワードを入力してください。\nSearch query cannot be empty. Please provide specific keywords.' }],
                isError: true
            };
        }

        if (args.num_results && (args.num_results < 1 || args.num_results > 10)) {
            return {
                content: [{ type: "text", text: '検索結果数は1から10の間で指定してください。\nNumber of results must be between 1 and 10.' }],
                isError: true
            };
        }

        try {
            const { apiKey, searchEngineId } = getApiKeys();

            const params = {
                key: apiKey,
                cx: searchEngineId,
                q: args.query,
                num: args.num_results || 5,
                dateRestrict: args.date_restrict,
                lr: args.language ? `lang_${args.language}` : undefined,
                cr: args.country ? `country${args.country.toUpperCase()}` : undefined,
                safe: args.safe_search || 'off'
            };

            const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                params
            });

            if (!response.data.items || !Array.isArray(response.data.items)) {
                return {
                    content: [{ type: "text", text: '検索結果が見つかりませんでした。検索条件を変更するか、APIキーの設定を確認してください。\nNo search results found. Please modify your search criteria or check your API key settings.' }],
                    isError: true
                };
            }

            const results: SearchResult[] = response.data.items.map((item: any) => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet,
                pagemap: item.pagemap,
                datePublished: item.pagemap?.metatags?.[0]?.['article:published_time'] || '',
                source: item.displayLink || ''
            }));

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        } catch (error: unknown) {
            return handleError(error, '検索');
        }
    }

    /**
     * ウェブページ内容抽出ハンドラー関数
     */
    private async handleAnalyzeWebpage(args: { url: string }) {
        try {
            new URL(args.url);
        } catch {
            return {
                content: [{
                    type: "text",
                    text: 'URLの形式が無効です。URLはhttp://またはhttps://で始まる必要があります。\nInvalid URL format. URL must start with http:// or https:// and be properly formatted.'
                }],
                isError: true
            };
        }

        try {
            const content = await this.contentFetcher.fetchContent(args.url);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(content, null, 2),
                    },
                ],
            };
        } catch (error: unknown) {
            return handleError(error, 'ウェブページの内容抽出');
        }
    }

    /**
     * 複数ウェブページ内容一括抽出ハンドラー関数
     */
    private async handleBatchAnalyzeWebpages(args: { urls: string[] }) {
        if (args.urls.length > 5) {
            return {
                content: [{
                    type: "text",
                    text: 'パフォーマンスを維持するため、1リクエストあたり最大5つのURLまでに制限されています。URLの数を減らしてください。\nMaximum 5 URLs allowed per request to maintain performance. Please reduce the number of URLs.'
                }],
                isError: true
            };
        }

        const invalidUrls = args.urls.filter((url: string) => {
            try {
                new URL(url);
                return false;
            } catch {
                return true;
            }
        });

        if (invalidUrls.length > 0) {
            return {
                content: [{
                    type: "text",
                    text: `以下のURLの形式が無効です: ${invalidUrls.join(', ')}\nすべてのURLはhttp://またはhttps://で始まる必要があります。\nInvalid URL format for: ${invalidUrls.join(', ')}\nAll URLs must start with http:// or https:// and be properly formatted.`
                }],
                isError: true
            };
        }

        try {
            const results = await this.contentFetcher.batchFetchContent(args.urls);

            const successfulUrls = Object.keys(results).filter(url =>
                results[url] && !('error' in results[url])
            );

            if (successfulUrls.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: 'どのURLからもコンテンツを抽出できませんでした。よくある問題:\n- ページが認証を必要とする\n- ページが公開されていない\n- コンテンツが動的に読み込まれる\n- URLがHTML以外のリソースを指している\n\nCould not extract content from any of the provided URLs. Common issues:\n- Pages require authentication\n- Pages are not publicly accessible\n- Content is dynamically loaded\n- URLs point to non-HTML resources'
                    }],
                    isError: true
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        } catch (error: unknown) {
            return handleError(error, '複数ウェブページの内容一括抽出');
        }
    }
}

// アプリケーションのメイン処理
async function main() {
    const service = new GoogleSearchService();
    try {
        await service.startServer();
    } catch (error) {
        console.error('Error starting MCP server:', error);
        process.exit(1);
    }
}

// アプリケーションの起動
if (typeof process !== 'undefined' && process.argv[1].endsWith('index.js')) {
    main().catch(error => {
        console.error('Error in main:', error);
        process.exit(1);
    });
} 