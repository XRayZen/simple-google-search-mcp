import axios from 'axios';
import * as cheerio from 'cheerio';
import { WebpageAnalysisResponse, WebpageContent } from './types.js';

/**
 * ウェブページのコンテンツを抽出するクラス
 */
export class ContentFetcher {
    /**
     * 単一ウェブページからコンテンツを抽出
     */
    async fetchContent(url: string): Promise<WebpageContent> {
        // テストモードの場合はモックデータを返す
        if (process.env.NODE_ENV === 'test') {
            console.error(`テストモード: ${url} のモックコンテンツを返します`);
            return this.generateMockWebpageContent(url);
        }
        
        try {
            // URLの形式を検証
            try {
                new URL(url);
            } catch (error) {
                throw new Error(`無効なURL形式: ${url}`);
            }

            // ウェブページをフェッチ
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                }
            });

            const html = response.data;

            // Cheerioを使用して解析
            const $ = cheerio.load(html);
            
            // 基本的なメタデータを抽出
            const title = $('title').text().trim() || 'No Title';
            const description = $('meta[name="description"]').attr('content') || 
                               $('meta[property="og:description"]').attr('content') || 
                               '';
            
            // メタタグを収集
            const metaTags: Record<string, string> = {};
            $('meta').each(function(this: any, _: number, element: any) {
                const name = $(element).attr('name') || $(element).attr('property');
                const content = $(element).attr('content');
                if (name && content) {
                    metaTags[name] = content;
                }
            });

            // 本文コンテンツの抽出
            const body = $('body');
            
            // 不要な要素を削除
            $('script, style, nav, footer, header, aside, iframe, .ads, .advertisement, .banner, #banner, #ads').remove();
            
            // 最も重要なセクションを特定
            let mainContent = $('main');
            if (mainContent.length === 0) {
                mainContent = $('article');
            }
            if (mainContent.length === 0) {
                mainContent = $('div[role="main"]');
            }
            if (mainContent.length === 0) {
                mainContent = $('div.content, div.main, div#content, div#main');
            }
            if (mainContent.length === 0) {
                mainContent = body;
            }

            // コンテンツをMarkdown風に変換
            let markdownContent = '';
            
            // 見出しやテキストを抽出
            mainContent.find('h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote').each(function(this: any, _: number, element: any) {
                const tagName = element.tagName.toLowerCase();
                const text = $(element).text().trim().replace(/\s+/g, ' ');
                
                if (!text) return;
                
                if (tagName.startsWith('h')) {
                    const level = tagName.substring(1);
                    const prefix = '#'.repeat(parseInt(level));
                    markdownContent += `${prefix} ${text}\n\n`;
                } else if (tagName === 'p') {
                    markdownContent += `${text}\n\n`;
                } else if (tagName === 'ul' || tagName === 'ol') {
                    $(element).find('li').each(function(this: any, _: number, li: any) {
                        markdownContent += `- ${$(li).text().trim()}\n`;
                    });
                    markdownContent += '\n';
                } else if (tagName === 'blockquote') {
                    markdownContent += `> ${text}\n\n`;
                }
            });

            // 単語数をカウント（簡易的な方法）
            const wordCount = markdownContent.split(/\s+/).filter(Boolean).length;
            
            // 結果を返す
            return {
                url,
                title,
                description,
                markdown_content: markdownContent,
                meta_tags: metaTags,
                stats: {
                    word_count: wordCount,
                    approximate_chars: markdownContent.length
                },
                content_preview: {
                    first_500_chars: markdownContent.substring(0, 500)
                }
            };
        } catch (error) {
            console.error(`コンテンツの抽出に失敗しました (${url}):`, error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(`ウェブページの取得に失敗しました (HTTP ${error.response.status}): ${url}`);
            } else if (error instanceof Error) {
                throw new Error(`コンテンツ抽出エラー: ${error.message}`);
            } else {
                throw new Error(`コンテンツの抽出に失敗しました: ${url}`);
            }
        }
    }

    /**
     * 複数のウェブページからコンテンツを一括抽出
     */
    async batchFetchContent(urls: string[]): Promise<WebpageAnalysisResponse> {
        // テストモードの場合はモックデータを返す
        if (process.env.NODE_ENV === 'test') {
            console.error(`テストモード: ${urls.length}件のモックコンテンツを返します`);
            const mockResults: WebpageAnalysisResponse = {};
            for (const url of urls) {
                mockResults[url] = this.generateMockWebpageContent(url);
            }
            return mockResults;
        }
        
        // URL件数の制限チェック（5件まで）
        if (urls.length > 5) {
            throw new Error('パフォーマンスを維持するため、一度に最大5つのURLまでに制限されています。');
        }

        const results: WebpageAnalysisResponse = {};

        // 各URLに対して並列処理
        await Promise.all(urls.map(async (url) => {
            try {
                const content = await this.fetchContent(url);
                results[url] = content;
            } catch (error) {
                if (error instanceof Error) {
                    results[url] = { error: error.message };
                } else {
                    results[url] = { error: '不明なエラーが発生しました' };
                }
            }
        }));

        return results;
    }
    
    /**
     * モックウェブページコンテンツを生成
     */
    private generateMockWebpageContent(url: string): WebpageContent {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        return {
            url: url,
            title: `Mock Page Title for ${domain}`,
            description: `This is a mock webpage description for testing purposes. URL: ${url}`,
            markdown_content: `# Mock Content for ${domain}\n\nThis is a mock webpage content generated for testing purposes.\n\n## Section 1\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n## Section 2\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris.`,
            meta_tags: {
                'author': 'Mock Generator',
                'description': `Mock webpage for ${domain}`,
                'keywords': 'mock, test, webpage'
            },
            stats: {
                word_count: 50,
                approximate_chars: 300
            },
            content_preview: {
                first_500_chars: `# Mock Content for ${domain}\n\nThis is a mock webpage content generated for testing purposes.\n\n## Section 1\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n## Section 2\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris.`
            }
        };
    }
} 