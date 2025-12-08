import Papa from 'papaparse';
import React from 'react';

const TAGS_CSV_PATH = '/data/tags/danbooru_2024-12-22_pt25-ia-dd.csv';
const STORAGE_KEY_TAGS = 'tags_v2024';
const STORAGE_KEY_VERSION = 'tags_version';
const VERSION_STRING = '2024-12-22';
const TAG_CHARS_REGEX = /[a-zA-Z0-9_()\-:]/;

/**
 * Loads tags from CSV, processes them, and caches in localStorage.
 * Uses caching to avoid repeated parsing proper.
 * @returns {Promise<Array>} List of tag objects
 */
const DB_NAME = 'DanbooruTagsDB';
const STORE_NAME = 'tags';
const DB_VERSION = 1;

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => reject(event.target.error);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
    });
};

export const loadTags = async () => {
    try {
        const db = await openDB();

        // Check Cache
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        const cachedVersionReq = store.get(STORAGE_KEY_VERSION);
        const cachedTagsReq = store.get(STORAGE_KEY_TAGS);

        const [cachedVersion, cachedTags] = await Promise.all([
            new Promise(resolve => { cachedVersionReq.onsuccess = () => resolve(cachedVersionReq.result); }),
            new Promise(resolve => { cachedTagsReq.onsuccess = () => resolve(cachedTagsReq.result); })
        ]);

        if (cachedVersion === VERSION_STRING && cachedTags) {
            console.log('Loaded tags from IndexedDB cache');
            return cachedTags;
        }

        console.log('Fetching and parsing tags CSV...');
        return new Promise((resolve, reject) => {
            Papa.parse(TAGS_CSV_PATH, {
                download: true,
                header: false,
                skipEmptyLines: true,
                complete: async (results) => {
                    const rawData = results.data;
                    const processedTags = rawData.map(row => {
                        const name = row[0];
                        const type = parseInt(row[1], 10);
                        const count = parseInt(row[2], 10);
                        const aliases = row[3] || '';
                        return {
                            name: name,
                            type: isNaN(type) ? 0 : type,
                            count: isNaN(count) ? 0 : count,
                            aliases: aliases,
                            lowerName: name ? name.toLowerCase() : '',
                            lowerAliases: aliases ? aliases.toLowerCase() : ''
                        };
                    });

                    processedTags.sort((a, b) => b.count - a.count);

                    // Cache in IndexedDB
                    try {
                        const writeTx = db.transaction(STORE_NAME, 'readwrite');
                        const writeStore = writeTx.objectStore(STORE_NAME);
                        writeStore.put(VERSION_STRING, STORAGE_KEY_VERSION);
                        writeStore.put(processedTags, STORAGE_KEY_TAGS);
                        console.log(`Cached ${processedTags.length} tags in IndexedDB.`);
                    } catch (e) {
                        console.warn('Failed to cache tags in IndexedDB', e);
                    }

                    resolve(processedTags);
                },
                error: (err) => {
                    console.error('Papa Parse error:', err);
                    reject(err);
                }
            });
        });
    } catch (e) {
        console.error("IndexedDB error:", e);
        // Fallback to no-cache if DB fails
        return new Promise((resolve, reject) => {
            Papa.parse(TAGS_CSV_PATH, {
                download: true,
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    /* duplicate processing logic for fallback... simplified */
                    const tags = results.data.map(row => ({
                        name: row[0],
                        type: parseInt(row[1]) || 0,
                        count: parseInt(row[2]) || 0,
                        aliases: row[3] || '',
                        lowerName: row[0] ? row[0].toLowerCase() : '',
                        lowerAliases: row[3] ? row[3].toLowerCase() : ''
                    })).sort((a, b) => b.count - a.count);
                    resolve(tags);
                },
                error: reject
            });
        });
    }
};

/**
 * Searches tags based on query.
 * Ranking:
 * 1. Starts with query
 * 2. Contains query
 * Within groups, sorted by post_count (already sorted in global list, so stable sort keeps it).
 * @param {Array} tags Full list of tags
 * @param {string} query Search query
 * @param {number} limit Max results
 * @returns {Array} Sorted matches
 */
export const searchTags = (tags, query, limit = 50) => {
    if (!query || query.trim() === '') return [];

    const lowerQuery = query.toLowerCase();

    // We want to scan the array and pick the best matches until we hit the limit.
    // Since 'tags' is already sorted by count, we can iterate and pick 'startsWith' matches first?
    // Actually, standard filtering might be slow if we need to iterate 140k items twice.
    // Single pass approach: 
    // Collect matching items with a score.
    // Score: (startsWith ? 10_000_000 : 0) + count
    // But strictly filtering top 50 by this score might require full scan.
    // 140k is small enough for a full scan in modern JS engines (~10-20ms).

    const matches = [];

    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        const startsAsName = tag.lowerName.startsWith(lowerQuery);
        const startsAsAlias = tag.lowerAliases.includes(',' + lowerQuery) || tag.lowerAliases.startsWith(lowerQuery);
        // ^ Alias check is complex because simple 'includes' matches mid-word. 
        // Ideally we treat aliases as a list, but for speed 'contains' might be acceptable or we regex.
        // Let's stick to simple string inclusion for aliases for now, but prioritize name matches.

        // Simplification for user request: "Starts with query" vs "Contains query"
        // We check purely on Tag Name for the primary ranking? 
        // Or do we match aliases too? 
        // User said: "Starts with query" (priority 1), "Contains query" (priority 2).

        let isMatch = false;
        let isStartsWith = false;

        if (startsAsName) {
            isMatch = true;
            isStartsWith = true;
        } else if (tag.lowerName.includes(lowerQuery)) {
            isMatch = true;
        } else if (tag.lowerAliases.includes(lowerQuery)) {
            // If matches alias, we treat it as a "contains" match usually, unless it strictly starts with.
            isMatch = true;
        }

        if (isMatch) {
            // We can store it.
            matches.push({
                ...tag,
                // Pre-calc score for sorting the slice later
                score: (isStartsWith ? 10_000_000 : 0) + tag.count
            });
        }
    }

    // Sort matches by score descending
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, limit);
};

/**
 * Escapes special characters for Danbooru tags (parentheses).
 * @param {string} tag 
 * @returns {string}
 */
export const escapeTag = (tag) => {
    if (!tag) return '';
    // Escape ( and ) with backslash
    return tag.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
};

/**
 * Detects the token at specific cursor position.
 * Allows multi-word tokens including weighted syntax like (tag:1.1).
 * @param {string} text 
 * @param {number} cursor 
 * @returns {object|null} { token, start, end }
 */
export const getCurrentToken = (text, cursor) => {
    if (!text) return null;

    // Expand left
    let start = cursor;
    while (start > 0 && TAG_CHARS_REGEX.test(text[start - 1])) {
        start--;
    }

    // Expand right
    let end = cursor;
    while (end < text.length && TAG_CHARS_REGEX.test(text[end])) {
        end++;
    }

    if (start === end) return null;

    let tokenStr = text.substring(start, end);

    // Trim leading delimiters that shouldn't be part of the search (e.g. '(', ':')
    // This allows typing "(tag" and searching for "tag"
    let trimStart = 0;
    while (trimStart < tokenStr.length && /^[:(]/.test(tokenStr[trimStart])) {
        trimStart++;
    }

    // Trim trailing delimiters
    // e.g. "tag)" -> "tag"
    let trimEnd = tokenStr.length;
    while (trimEnd > trimStart && /[):]/.test(tokenStr[trimEnd - 1])) {
        trimEnd--;
    }

    if (trimStart >= trimEnd) return null;

    return {
        token: tokenStr.substring(trimStart, trimEnd),
        start: start + trimStart,
        end: start + trimEnd
    };
};



export const TAG_TYPES = {
    0: { label: 'General', color: '#009be6' }, // Blue
    1: { label: 'Artist', color: '#ff8a8b' },  // Red/Pinkish
    3: { label: 'Copyright', color: '#c797ff' }, // Purple
    4: { label: 'Character', color: '#35c64a' }, // Green
    5: { label: 'Meta', color: '#ead084' },    // Yellow/Gold
};
