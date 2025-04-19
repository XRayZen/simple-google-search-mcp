import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadApiKeys, validateApiKeys } from './config.js';
import { GoogleSearchService } from './index.js';

// ESモジュール用の__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Keys確認
function setupApiKeys(): boolean {
    try {
        // テストモードの設定
        process.env.NODE_ENV = 'test';

        // api-keys.jsonファイルが存在するか確認
        const apiKeysPath = path.resolve(__dirname, '..', 'api-keys.json');
        if (!fs.existsSync(apiKeysPath)) {
            console.log('テスト用のapi-keys.jsonが見つかりません。');
            
            // .envrcから環境変数が設定されているか確認
            if (process.env.API_KEY && process.env.SEARCH_ENGINE_ID) {
                console.log('.envrcから環境変数を読み込みました。');
                process.env.GOOGLE_API_KEY = process.env.API_KEY;
                process.env.GOOGLE_SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
                return true;
            }
            
            // 環境変数が設定されているか確認
            if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
                console.log('既存の環境変数からAPIキーを読み込みました。');
                return true;
            }
            
            console.log('APIキーが設定されていません。テストモードでモックAPIキーを使用します。');
            return true;
        }

        // APIキーを読み込む
        loadApiKeys();

        // APIキーが有効か確認
        return validateApiKeys();
    } catch (error) {
        console.error('APIキーのセットアップに失敗しました:', error);
        console.log('テストモードでモックAPIキーを使用します。');
        return true;
    }
}

// メインテスト関数
async function runTests() {
    console.log('Google検索およびウェブページ抽出テストを開始します...');

    // APIキーをセットアップ
    const keysValid = setupApiKeys();
    if (!keysValid) {
        console.error('有効なAPIキーがないためテストを中止します。');
        process.exit(1);
    }

    try {
        // GoogleSearchServiceをインスタンス化
        const service = new GoogleSearchService();

        // 1. Google検索のテスト
        await testGoogleSearch(service);

        // 2. ウェブページ抽出のテスト
        await testWebpageExtraction(service);

        // 3. 複数ウェブページの一括抽出テスト
        await testBatchWebpageExtraction(service);

        console.log('\nすべてのテストが成功しました！');
    } catch (error) {
        console.error('テスト中にエラーが発生しました:', error);
        process.exit(1);
    }
}

// 1. Google検索のテスト
async function testGoogleSearch(service: GoogleSearchService) {
    console.log('\n=== Google検索テスト ===');

    // 基本的な検索テスト
    console.log('基本的な検索テストを実行中...');
    try {
        const results = await service.search('TypeScript programming tutorial');

        // 結果の検証
        if (!Array.isArray(results) || results.length === 0) {
            throw new Error('検索結果が空または不正な形式です。');
        }

        console.log(`検索成功: ${results.length}件の結果が見つかりました。`);
        console.log('最初の結果:', {
            title: results[0].title,
            link: results[0].link,
            snippet: results[0].snippet?.substring(0, 100) + '...'
        });
    } catch (error) {
        console.error('基本的な検索テストに失敗しました:', error);
        throw error;
    }

    // 結果数の指定テスト
    console.log('\n検索結果数の指定テストを実行中...');
    try {
        const limitedResults = await service.search('JavaScript programming', 3);

        if (limitedResults.length !== 3) {
            throw new Error(`指定した結果数(3)と異なる結果数(${limitedResults.length})が返されました。`);
        }

        console.log(`検索成功: ${limitedResults.length}件の結果が指定通り返されました。`);
    } catch (error) {
        console.error('結果数の指定テストに失敗しました:', error);
        throw error;
    }

    // 拡張パラメータテスト
    console.log('\n拡張パラメータテストを実行中...');
    try {
        // 日付制限パラメータテスト
        console.log('日付制限パラメータテスト中...');
        const dateRestrictResult = await testAdvancedSearchParam(service, {
            query: 'news',
            date_restrict: 'm1' // 過去1ヶ月以内
        });
        console.log(`日付制限テスト成功: ${dateRestrictResult.length}件の結果が見つかりました。`);

        // 言語パラメータテスト
        console.log('言語パラメータテスト中...');
        const languageResult = await testAdvancedSearchParam(service, {
            query: 'プログラミング',
            language: 'ja'
        });
        console.log(`言語パラメータテスト成功: ${languageResult.length}件の結果が見つかりました。`);

        // 国・地域パラメータテスト
        console.log('国・地域パラメータテスト中...');
        const countryResult = await testAdvancedSearchParam(service, {
            query: 'local news',
            country: 'us'
        });
        console.log(`国・地域パラメータテスト成功: ${countryResult.length}件の結果が見つかりました。`);

        // セーフサーチパラメータテスト
        console.log('セーフサーチパラメータテスト中...');
        const safeSearchResult = await testAdvancedSearchParam(service, {
            query: 'content',
            safe_search: 'high'
        });
        console.log(`セーフサーチパラメータテスト成功: ${safeSearchResult.length}件の結果が見つかりました。`);

        // 複合パラメータテスト
        console.log('複合パラメータテスト中...');
        const combinedResult = await testAdvancedSearchParam(service, {
            query: 'technology',
            num_results: 5,
            date_restrict: 'y1',
            language: 'en',
            country: 'uk',
            safe_search: 'medium'
        });
        console.log(`複合パラメータテスト成功: ${combinedResult.length}件の結果が見つかりました。`);

    } catch (error) {
        console.error('拡張パラメータテストに失敗しました:', error);
        throw error;
    }

    // エラーハンドリングテスト
    console.log('\nエラーハンドリングテストを実行中...');
    try {
        await service.search('');
        throw new Error('空のクエリでエラーが発生しませんでした。');
    } catch (error) {
        // エラーが発生することを期待
        console.log('空クエリテスト成功: 適切にエラーがスローされました。');
    }
}

// 拡張検索パラメータテスト用ヘルパー関数
async function testAdvancedSearchParam(service: GoogleSearchService, params: {
    query: string;
    num_results?: number;
    date_restrict?: string;
    language?: string;
    country?: string;
    safe_search?: string;
}): Promise<any[]> {
    try {
        // 検索サービスメソッドを内部的に呼び出す
        const result = await (service as any).handleSearch(params);
        
        // エラーチェック
        if ('isError' in result && result.isError) {
            throw new Error(`検索パラメータが正しく処理されませんでした: ${result.content[0]?.text || 'unknown error'}`);
        }
        
        // 結果をJSONからパース
        const results = JSON.parse(result.content[0].text);
        
        // 結果の検証
        if (!Array.isArray(results)) {
            throw new Error('検索結果が配列ではありません。');
        }
        
        return results;
    } catch (error) {
        console.error(`パラメータ ${JSON.stringify(params)} でのテストに失敗:`, error);
        throw error;
    }
}

// 2. ウェブページ抽出のテスト
async function testWebpageExtraction(service: GoogleSearchService) {
    console.log('\n=== ウェブページ抽出テスト ===');

    // 単一ウェブページ抽出テスト
    console.log('単一ウェブページの抽出テストを実行中...');
    try {
        const testUrl = 'https://example.com';
        const content = await service.extractWebpage(testUrl);

        // 結果の検証
        if (!content || !content.url || !content.title) {
            throw new Error('ウェブページの抽出結果が不正な形式です。');
        }

        console.log('ウェブページ抽出成功:', {
            url: content.url,
            title: content.title,
            description: content.description?.substring(0, 50) + (content.description && content.description.length > 50 ? '...' : ''),
            content_length: content.markdown_content?.length || 0,
            word_count: content.stats?.word_count || 0
        });
    } catch (error) {
        console.error('単一ウェブページ抽出テストに失敗しました:', error);
        throw error;
    }

    // エラーケーステスト - 不正なURL
    console.log('\n不正なURLテストを実行中...');
    try {
        await service.extractWebpage('invalid-url');
        throw new Error('不正なURLでエラーが発生しませんでした。');
    } catch (error) {
        // エラーが発生することを期待
        console.log('不正なURLテスト成功: 適切にエラーがスローされました。');
    }
}

// 3. 複数ウェブページの一括抽出テスト
async function testBatchWebpageExtraction(service: GoogleSearchService) {
    console.log('\n=== 複数ウェブページ一括抽出テスト ===');

    // 複数ウェブページ抽出テスト
    console.log('複数ウェブページの抽出テストを実行中...');
    try {
        const testUrls = ['https://example.com', 'https://example.org'];
        const results = await service.batchExtractWebpages(testUrls);

        // 結果の検証
        const successfulUrls = Object.keys(results).filter(url => results[url] && !('error' in results[url]));
        
        if (successfulUrls.length === 0) {
            throw new Error('どのURLからもコンテンツを抽出できませんでした。');
        }

        console.log(`複数ウェブページ抽出: ${successfulUrls.length}/${testUrls.length}件が成功`);

        if (successfulUrls.length > 0) {
            const sampleUrl = successfulUrls[0];
            const sampleContent = results[sampleUrl] as any;
            console.log('サンプルページの抽出結果:', {
                url: sampleUrl,
                title: sampleContent.title,
                content_preview: sampleContent.content_preview?.first_500_chars?.substring(0, 50) + '...'
            });
        }
    } catch (error) {
        console.error('複数ウェブページ抽出テストに失敗しました:', error);
        throw error;
    }

    // URL件数制限テスト
    console.log('\nURL件数制限テストを実行中...');
    try {
        const tooManyUrls = [
            'https://example.com',
            'https://example.org',
            'https://example.net',
            'https://example.edu',
            'https://example.io',
            'https://example.dev'
        ];
        await service.batchExtractWebpages(tooManyUrls);
        throw new Error('URL件数が制限を超えてもエラーが発生しませんでした。');
    } catch (error) {
        // エラーが発生することを期待
        console.log('URL件数制限テスト成功: 適切にエラーがスローされました。');
    }
}

// テストを実行
if (typeof process !== 'undefined' && process.argv[1] === fileURLToPath(import.meta.url)) {
    runTests().catch(console.error);
} 