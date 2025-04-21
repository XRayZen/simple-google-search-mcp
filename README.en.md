# Simple Google Search MCP

A Google search service compliant with Model Context Protocol (MCP)
- Perfect companion for Vibe Coding!

**[日本語版はこちら (Japanese version)](README.md)**

## Features

- Search functionality using Google Custom Search API
- Web page content analysis and extraction
- Batch analysis of multiple web pages
- Advanced search options support:
  - Date restriction (date_restrict)
  - Language specification (language)
  - Country/region specification (country)
  - SafeSearch (safe_search)

## Setup

### Prerequisites

- Node.js 16 or higher
- Google Custom Search API key
- Google Custom Search Engine ID

### Installation

```bash
npm install
```

### Configuration

Set up your Google API key using one of the following methods:

### Method 1: Using Environment Variables

```bash
export GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
export GOOGLE_SEARCH_ENGINE_ID=YOUR_SEARCH_ENGINE_ID
```

### Build

```bash
npm run build
```

### Starting the Server

```bash
npm start
```

## Integration with Cline

Cline is an autonomous coding agent for VS Code that natively supports integration with MCP servers. To use Google Search MCP with Cline:

### Prerequisites

- Install [VS Code](https://code.visualstudio.com/)
- Install the [Cline extension](https://marketplace.visualstudio.com/items?itemName=cline.cline)
- Obtain Google API key and Search Engine ID (see "Setup" section above)

### Steps

1. Clone and set up the Google Search MCP server:

```bash
git clone https://github.com/your-username/google-search-mcp.git
cd google-search-mcp
npm install
```

2. Build and start the server:

```bash
npm run build
npm start
```

3. Configure Cline:
   - Open VS Code and ensure the Cline extension is enabled
   - Add a configuration file to the `~/Documents/Cline/MCP` directory (or `%USERPROFILE%\Documents\Cline\MCP` on Windows) with the following content:

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
      "/path/to/google-search-mcp/dist/index.js"
    ],
    "env": {
      "GOOGLE_API_KEY": "YOUR_GOOGLE_API_KEY",
      "GOOGLE_SEARCH_ENGINE_ID": "YOUR_SEARCH_ENGINE_ID"
    },
    "transportType": "stdio"
  }
}
```

   - Use `@GoogleSearch` or related tool names in Cline chat to invoke the functionality

### Configuration File Explanation

- `autoApprove`: List of tools to automatically approve
- `disabled`: Whether to disable the MCP server
- `timeout`: Timeout duration (in seconds)
- `command` and `args`: Command and arguments to start the MCP server
- `env`: Environment variable settings
- `transportType`: Communication method ("stdio" or "sse")

### Usage Examples

You can use the following in Cline chat:

```
@GoogleSearch Find the latest news about React

@ExtractWebpage Extract content from https://example.com/react-news
```

For detailed usage instructions, refer to the [Cline official documentation](https://cline.bot).

## Usage

This MCP server communicates with models via StandardIO. Supported tools include:

### google_search

Performs a Google search and returns results.

Arguments:
- `query` (required): Search query
- `num_results` (optional): Number of results to return (default: 5, max: 10)
- `date_restrict`: Restrict to a specific time period (e.g., 'd1'=past day, 'w2'=past 2 weeks, 'm3'=past 3 months, 'y1'=past year)
- `language`: Language restriction - ISO 639-1 codes (e.g., 'en'=English, 'ja'=Japanese)
- `country`: Country/region restriction - ISO 3166-1 alpha-2 codes (e.g., 'us'=United States, 'jp'=Japan)
- `safe_search`: SafeSearch level ('off'=no filtering, 'medium'=moderate, 'high'=strict)

### extract_webpage_content

Extracts content from a specified URL and returns it in readable text format.

Arguments:
- `url` (required): URL of the web page to extract content from (must start with `http://` or `https://`)

### extract_multiple_webpages

Extracts content from multiple web pages in batch.

Arguments:
- `urls` (required): Array of web page URLs to extract content from (maximum 5)

### Programmatic Usage

```typescript
import { GoogleSearchService } from 'google-search-mcp';

const service = new GoogleSearchService();

// Basic search
const results = await service.search('TypeScript programming');

// Specify number of results
const limitedResults = await service.search('AI trends', 3);

// Using advanced search options
const advancedResults = await service.search('programming', 5, {
  date_restrict: 'm3', // Within the past 3 months
  language: 'en',      // English
  country: 'us',       // United States
  safe_search: 'high'  // Strict SafeSearch
});

// Extract web page content
const content = await service.extractWebpage('https://example.com');

// Batch extract from multiple web pages
const batchResults = await service.batchExtractWebpages([
  'https://example.com',
  'https://example.org'
]);
```

## Testing

Run tests using the following command:

```bash
npm test
```

Test code includes the following functionality:
- Google search tests
- Single web page content extraction tests
- Multiple web page content extraction tests
- Error handling tests

## Customization

To add more advanced features, extend the server implementation.

## Notes

- Google Custom Search API has usage limits. For details, refer to the [Google Custom Search API documentation](https://developers.google.com/custom-search/v1/overview).
- Some search options may not be available depending on your Google Custom Search API plan.
