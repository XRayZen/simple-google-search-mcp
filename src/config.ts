import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApiKeys } from './types.js';

// Get directory name for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// モック用のデフォルトAPIキー
const MOCK_API_KEY = 'mock_api_key';
const MOCK_SEARCH_ENGINE_ID = 'mock_search_engine_id';

/**
 * Load API keys from api-keys.json and set them to environment variables
 */
export function loadApiKeys(): void {
    try {
        // Check for environment variables first
        if (process.env.API_KEY && process.env.SEARCH_ENGINE_ID) {
            process.env.GOOGLE_API_KEY = process.env.API_KEY;
            process.env.GOOGLE_SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
            console.log('API keys loaded from environment variables (.envrc)');
            return;
        }

        // Get path to api-keys.json (assumed to be in parent directory)
        const apiKeysPath = path.resolve(__dirname, '..', 'api-keys.json');

        // Check if file exists
        if (!fs.existsSync(apiKeysPath)) {
            console.warn('api-keys.json not found. Will try to load from environment variables.');
            return;
        }

        // Read and parse the file
        const apiKeysJson = fs.readFileSync(apiKeysPath, 'utf-8');
        const apiKeys: ApiKeys = JSON.parse(apiKeysJson);

        // Check if keys are properly set
        if (!apiKeys.api_key || !apiKeys.search_engine_id) {
            console.warn('api-keys.json does not contain api_key or search_engine_id.');
            return;
        }

        // Set environment variables
        process.env.GOOGLE_API_KEY = apiKeys.api_key;
        process.env.GOOGLE_SEARCH_ENGINE_ID = apiKeys.search_engine_id;

        console.log('API keys loaded from api-keys.json');
    } catch (error) {
        console.warn('Error loading api-keys.json:', error);
        console.log('Will try to load API keys from environment variables.');
    }
}

/**
 * Get API keys
 */
export function getApiKeys(): { apiKey: string; searchEngineId: string } {
    // テストモード時にはモックキーを使用
    if (process.env.NODE_ENV === 'test') {
        return {
            apiKey: process.env.GOOGLE_API_KEY || MOCK_API_KEY,
            searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID || MOCK_SEARCH_ENGINE_ID
        };
    }
    
    return {
        apiKey: process.env.GOOGLE_API_KEY || '',
        searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID || ''
    };
}

/**
 * Validate if API keys are set
 */
export function validateApiKeys(): boolean {
    // テストモード時には常にtrueを返す
    if (process.env.NODE_ENV === 'test') {
        return true;
    }
    
    const { apiKey, searchEngineId } = getApiKeys();
    return !!apiKey && !!searchEngineId;
} 