import axios from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import type { LinkData } from '../types/index.ts';

export class WebScraper {
    async fetchAndParse(url: string): Promise<LinkData> {
        try {
            // 1. Detect URL Type
            const type = this.detectUrlType(url);
            console.log(`🔍 Scraper: Fetching ${url} [${type}]`);

            // 2. Route Strategy
            switch (type) {
                case 'tweet':
                    return await this.scrapeTweet(url);
                case 'youtube':
                    return await this.scrapeYouTube(url);
                case 'article':
                default:
                    return await this.scrapeArticle(url);
            }

        } catch (error) {
            console.error(`❌ Scraper Failed for ${url}:`, error);
            return {
                isValid: false,
                text: '',
                type: 'unknown'
            };
        }
    }

    private detectUrlType(url: string): LinkData['type'] {
        if (url.includes('twitter.com') || url.includes('x.com')) return 'tweet';
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('espn.com') || url.includes('bbc.com') || url.includes('reuters.com')) return 'article';
        return 'article'; // Default fallback
    }

    private async scrapeArticle(url: string): Promise<LinkData> {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; DjinnOracleBot/1.0; +http://djinn.market/bot)'
                },
                timeout: 10000 // 10s timeout
            });

            const $ = cheerio.load(response.data);

            // Extract Main Content (Smart Heuristic)
            // Try <article>, then <main>, then fallback to <body> but remove navigation/footers
            $('script').remove();
            $('style').remove();
            $('nav').remove();
            $('footer').remove();
            $('header').remove();

            let text = $('article').text() || $('main').text() || $('body').text();
            text = text.replace(/\s+/g, ' ').trim(); // Normalize whitespace

            const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                $('meta[name="date"]').attr('content');

            const author = $('meta[name="author"]').attr('content') ||
                $('meta[property="article:author"]').attr('content');

            return {
                isValid: text.length > 50, // Minimum content check
                text: text.substring(0, 8000), // Limit for LLM Context Window
                publishDate,
                author,
                type: 'article'
            };
        } catch (e) {
            throw new Error(`Article scrape failed: ${e}`);
        }
    }

    // Placeholder strategies for Phase 1
    // Real implementation for Twitter/YouTube often requires specialized APIs or headless browsers (Puppeteer)
    // due to heavy client-side rendering.
    private async scrapeTweet(url: string): Promise<LinkData> {
        // For now, return valid but empty, instructing LLM to use "Web Search" via Perplexity fallback
        // Or if we have TWITTER_API_KEY, use it here.
        return {
            isValid: true,
            text: `[TWEET DETECTED] Content from ${url}. Use Perplexity/Sonar to verify this tweet's existence and content.`,
            type: 'tweet'
        };
    }

    private async scrapeYouTube(url: string): Promise<LinkData> {
        return {
            isValid: true,
            text: `[VIDEO DETECTED] Content from ${url}. Use Perplexity/Sonar to find summary or transcript.`,
            type: 'youtube'
        };
    }
}
