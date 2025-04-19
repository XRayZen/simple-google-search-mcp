# Simple Google Search MCP

Model Context Protocol (MCP)準拠のGoogle検索サービス
- Vibe Codingのお供にどうぞ！

**[日本語・英語切り替え可能なドキュメントを表示する（View documentation with Japanese/English toggle）](index.html)**

## 機能

- Google Custom Search APIを利用した検索機能
- ウェブページの内容解析・抽出機能
- 複数ウェブページの一括解析機能
- 高度な検索オプション対応：
  - 日付制限（date_restrict）
  - 言語指定（language）
  - 国・地域指定（country）
  - セーフサーチ（safe_search）

## セットアップ

### 前提条件

- Node.js 16以上
- Google Custom Search API キー
- Google Custom Search Engine ID

### インストール

```bash
npm install
```

### 設定

以下の方法でGoogle APIキーを設定してください：

### 方法1：環境変数を使用

```bash
export GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
export GOOGLE_SEARCH_ENGINE_ID=YOUR_SEARCH_ENGINE_ID
```

### ビルド

```bash
npm run build
```

### サーバーの起動

```bash
npm start
```

## Clineでの導入方法

Clineは、VS Code向けの自律型コーディングエージェントで、MCPサーバーとの統合をネイティブにサポートしています。Google Search MCPをClineで使用するには：

### 前提条件

- [VS Code](https://code.visualstudio.com/)のインストール
- [Cline拡張機能](https://marketplace.visualstudio.com/items?itemName=cline.cline)のインストール
- Google APIキーとSearch Engine IDの取得（上記の「セットアップ」セクション参照）

### 手順

1. Google Search MCPサーバーをクローンして設定:

```bash
git clone https://github.com/yourusername/google-search-mcp.git
cd google-search-mcp
npm install
```

1. サーバーをビルドして起動:

```bash
npm run build
npm start
```

4. Clineでの設定:
   - VS Codeを開き、Cline拡張機能が有効になっていることを確認
   - `~/Documents/Cline/MCP` ディレクトリ（Windowsの場合は`%USERPROFILE%\Documents\Cline\MCP`）に以下のような設定ファイルを追加

```json
{
  "google-search-mcp": {
    "autoApprove": [
      "google_search",
      "extract_webpage_content",
      "extract_multiple_webpages"
    ],
    "disabled": false,
    "timeout": 60,
    "command": "node",
    "args": [
      "実際のパス/google-search-mcp/dist/index.js"
    ],
    "env": {
      "GOOGLE_API_KEY": "YOUR_GOOGLE_API_KEY",
      "GOOGLE_SEARCH_ENGINE_ID": "YOUR_SEARCH_ENGINE_ID"
    },
    "transportType": "stdio"
  }
}
```

   - Clineチャットで `@GoogleSearch` または関連ツール名を使用して機能を呼び出し

### 設定ファイルの説明

- `autoApprove`: 自動承認するツールのリスト
- `disabled`: MCPサーバーを無効にするかどうか
- `timeout`: タイムアウト時間（秒）
- `command` と `args`: MCPサーバーを起動するコマンドと引数
- `env`: 環境変数の設定
- `transportType`: 通信方式（"stdio"または"sse"）

### 利用例

Clineチャットで以下のように使用できます:

```
@GoogleSearch React関連の最新ニュースを探して

@ExtractWebpage https://example.com/react-news からコンテンツを抽出
```

詳細な使用方法については、[Cline公式ドキュメント](https://cline.bot)を参照してください。

## 使用方法

このMCPサーバーは、StandardIOを介してモデルと通信します。サポートされているツールは：

### google_search

Google検索を実行し、結果を返します。

引数:
- `query` (必須): 検索クエリ
- `num_results` (オプション): 返す結果の数（デフォルト: 5、最大: 10）
- `date_restrict`: 特定の期間に絞り込み (例: 'd1'=過去1日, 'w2'=過去2週間, 'm3'=過去3ヶ月, 'y1'=過去1年)
- `language`: 言語絞り込み - ISO 639-1コード (例: 'en'=英語, 'ja'=日本語)
- `country`: 国・地域絞り込み - ISO 3166-1 alpha-2コード (例: 'us'=米国, 'jp'=日本)
- `safe_search`: セーフサーチレベル ('off'=フィルタなし, 'medium'=中程度, 'high'=厳格)

### extract_webpage_content

指定されたURLからウェブページのコンテンツを抽出し、読みやすいテキスト形式で返します。

引数:
- `url` (必須): コンテンツを抽出するウェブページのURL（`http://`または`https://`で始まる必要あり）

### extract_multiple_webpages

複数のウェブページから一括でコンテンツを抽出します。

引数:
- `urls` (必須): コンテンツを抽出するウェブページのURLの配列（最大5つまで）

### プログラムからの利用

```typescript
import { GoogleSearchService } from 'google-search-mcp';

const service = new GoogleSearchService();

// 基本的な検索
const results = await service.search('TypeScript programming');

// 結果数を指定
const limitedResults = await service.search('AI trends', 3);

// 高度な検索オプションの使用
const advancedResults = await service.search('programming', 5, {
  date_restrict: 'm3', // 過去3ヶ月以内
  language: 'ja',      // 日本語
  country: 'jp',       // 日本
  safe_search: 'high'  // 厳格なセーフサーチ
});

// ウェブページの内容抽出
const content = await service.extractWebpage('https://example.com');

// 複数ウェブページの一括抽出
const batchResults = await service.batchExtractWebpages([
  'https://example.com',
  'https://example.org'
]);
```

## テスト

テスト実行には以下のコマンドを使用します：

```bash
npm test
```

テストコードには以下の機能が含まれています：
- Google検索のテスト
- 単一ウェブページからのコンテンツ抽出テスト
- 複数ウェブページからのコンテンツ抽出テスト
- エラー処理テスト

## カスタマイズ

より高度な機能を追加するには、サーバー実装を拡張してください。

## 注意事項

- Google Custom Search APIには使用制限があります。詳細は[Google Custom Search APIのドキュメント](https://developers.google.com/custom-search/v1/overview)を参照してください。
- 一部の検索オプションはGoogle Custom Search APIのプランによって利用できない場合があります。
