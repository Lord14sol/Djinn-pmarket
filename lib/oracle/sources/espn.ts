import { BaseSource, SourceResult } from './base';
import { Evidence } from '../index';

// ============================================
// ESPN SOURCE - Live Sports Scores
// ============================================

interface ESPNConfig {
    enabled: boolean;
}

const SPORT_ENDPOINTS: Record<string, string> = {
    'nba': 'basketball/nba',
    'nfl': 'football/nfl',
    'mlb': 'baseball/mlb',
    'nhl': 'hockey/nhl',
    'soccer': 'soccer/eng.1', // Premier League
    'laliga': 'soccer/esp.1',
    'champions': 'soccer/uefa.champions',
    'world cup': 'soccer/fifa.world',
    'copa america': 'soccer/conmebol.america',
    'argentina': 'soccer/arg.1',
};

export class ESPNSource extends BaseSource {
    private baseUrl = 'http://site.api.espn.com/apis/site/v2/sports';

    constructor(config: ESPNConfig) {
        super('espn', 'ESPN Sports', config);
    }

    isConfigured(): boolean {
        return this.config.enabled;
    }

    async search(query: string, keywords: string[]): Promise<SourceResult> {
        if (!this.isConfigured()) {
            return { success: false, evidence: [], error: 'ESPN not enabled' };
        }

        try {
            await this.log(`Searching ESPN for: ${query}`);

            // Detect sport
            let sportPath = '';
            const lowerQuery = query.toLowerCase();
            for (const [key, path] of Object.entries(SPORT_ENDPOINTS)) {
                if (lowerQuery.includes(key)) {
                    sportPath = path;
                    break;
                }
            }

            if (!sportPath) {
                // Default to soccer/world cup if nothing specific found
                if (lowerQuery.includes('football') || lowerQuery.includes('futbol') || lowerQuery.includes('fútbol')) {
                    sportPath = 'soccer/fifa.world';
                } else {
                    return { success: true, evidence: [] };
                }
            }

            const url = `${this.baseUrl}/${sportPath}/scoreboard`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`ESPN API error: ${response.status}`);

            const data = await response.json();
            const evidence: Evidence[] = [];

            // Extract relevant events
            const events = data.events || [];
            for (const event of events.slice(0, 5)) {
                const competition = event.competitions?.[0];
                const homeTeam = competition?.competitors?.find((c: any) => c.homeAway === 'home');
                const awayTeam = competition?.competitors?.find((c: any) => c.homeAway === 'away');

                if (homeTeam && awayTeam) {
                    evidence.push({
                        url: `https://www.espn.com/soccer/match/_/gameId/${event.id}`,
                        title: `${awayTeam.team?.displayName || 'Away'} vs ${homeTeam.team?.displayName || 'Home'}`,
                        snippet: `🏟️ ${event.status?.type?.description || 'Scheduled'} | Score: ${awayTeam.score || '0'} - ${homeTeam.score || '0'} | ${event.date ? new Date(event.date).toLocaleDateString() : ''}`,
                        source: 'espn',
                        timestamp: event.date || new Date().toISOString()
                    });
                }
            }

            await this.log(`Found ${evidence.length} ESPN results`, { count: evidence.length });
            return { success: true, evidence };

        } catch (error) {
            await this.logError('ESPN search failed', error);
            return { success: false, evidence: [], error: String(error) };
        }
    }
}
