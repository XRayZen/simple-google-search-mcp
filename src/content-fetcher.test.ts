import { fileURLToPath } from 'url';
import { ContentFetcher } from './content-fetcher.js';

// テストの実行
async function runTests() {
    console.log('ウェブページ抽出テストを開始します...');

    // テストモードを設定
    process.env.NODE_ENV = 'test';

    // テスト実行
    try {
        const contentFetcher = new ContentFetcher();
        
        // 単一ウェブページ抽出テスト
        await testSingleWebpageExtraction(contentFetcher);
        
        // 複数ウェブページ抽出テスト
        await testBatchWebpageExtraction(contentFetcher);
        
        // 不正なURL処理テスト
        await testInvalidUrl(contentFetcher);
        
        console.log('すべてのウェブページ抽出テストが成功しました！');
    } catch (error) {
        console.error('テスト中にエラーが発生しました:', error);
        process.exit(1);
    }
}

// 単一ウェブページ抽出テスト
async function testSingleWebpageExtraction(fetcher: ContentFetcher) {
    console.log('\n単一ウェブページの取得テストを実行中...');
    try {
        const testUrl = 'https://example.com';
        const content = await fetcher.fetchContent(testUrl);

        // 結果の検証
        if (!content || !content.url || !content.title) {
            throw new Error('ウェブページの取得結果が不正な形式です。');
        }

        console.log('ウェブページ取得成功:', {
            url: content.url,
            title: content.title,
            description: content.description?.substring(0, 50) + '...',
            content_length: content.markdown_content?.length || 0,
            word_count: content.stats?.word_count || 0
        });
    } catch (error) {
        console.error('単一ウェブページ取得テストに失敗しました:', error);
        throw error;
    }
}

// 複数ウェブページ抽出テスト
async function testBatchWebpageExtraction(fetcher: ContentFetcher) {
    console.log('\n複数ウェブページの一括取得テストを実行中...');
    try {
        const testUrls = ['https://example.com', 'https://example.org'];
        const results = await fetcher.batchFetchContent(testUrls);

        // 結果の検証
        const successfulUrls = Object.keys(results).filter(url => !('error' in results[url]));
        console.log(`複数ウェブページ取得: ${successfulUrls.length}/${testUrls.length}件が成功`);

        // 成功したページの詳細を表示
        if (successfulUrls.length > 0) {
            const sampleUrl = successfulUrls[0];
            const sampleContent = results[sampleUrl] as any;
            console.log('サンプルページの取得結果:', {
                url: sampleUrl,
                title: sampleContent.title,
                content_preview: sampleContent.content_preview?.first_500_chars?.substring(0, 50) + '...'
            });
        }
    } catch (error) {
        console.error('複数ウェブページ取得テストに失敗しました:', error);
        throw error;
    }
}

// 不正なURL処理テスト
async function testInvalidUrl(fetcher: ContentFetcher) {
    console.log('\n不正なURLテストを実行中...');
    try {
        await fetcher.fetchContent('invalid-url');
        throw new Error('不正なURLでエラーが発生しませんでした。');
    } catch (error) {
        if (error instanceof Error && error.message.includes('不正なURLでエラーが発生しませんでした')) {
            throw error;
        }
        console.log('不正なURLテスト成功: 適切にエラーがスローされました。');
    }
}

// テストを実行
if (typeof process !== 'undefined' && process.argv[1] === fileURLToPath(import.meta.url)) {
    runTests().catch(console.error);
} 