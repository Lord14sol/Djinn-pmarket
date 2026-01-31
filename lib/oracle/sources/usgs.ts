import { BaseSource, SourceResult } from './base';
import { Evidence } from '../index';

// ============================================
// USGS SOURCE - Earthquakes & Natural Disasters
// ============================================

interface USGSConfig {
    enabled: boolean;
}

export class USGSSource extends BaseSource {
    private endpoint = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

    constructor(config: USGSConfig) {
        super('usgs', 'USGS Earthquakes', config);
    }

    isConfigured(): boolean {
        return this.config.enabled;
    }

    async search(query: string, keywords: string[]): Promise<SourceResult> {
        if (!this.isConfigured()) {
            return { success: false, evidence: [], error: 'USGS not enabled' };
        }

        const lowerQuery = query.toLowerCase();
        if (!lowerQuery.includes('earthquake') && !lowerQuery.includes('terremoto') && !lowerQuery.includes('seism')) {
            return { success: true, evidence: [] };
        }

        try {
            await this.log(`Searching USGS for earthquake data`);

            // Get recent significant earthquakes
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const startDateStr = startDate.toISOString().split('T')[0];

            const url = `${this.endpoint}?format=geojson&starttime=${startDateStr}&minmagnitude=4.5&limit=10&orderby=time`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`USGS API error: ${response.status}`);

            const data = await response.json();
            const evidence: Evidence[] = [];

            const features = data.features || [];
            for (const feature of features.slice(0, 5)) {
                const props = feature.properties;
                evidence.push({
                    url: props.url || 'https://earthquake.usgs.gov/',
                    title: `M${props.mag?.toFixed(1)} - ${props.place || 'Unknown Location'}`,
                    snippet: `🌍 Magnitude: ${props.mag?.toFixed(1)} | 📅 ${new Date(props.time).toLocaleString()} | ⚠️ ${props.alert || 'No alert'}`,
                    source: 'usgs',
                    timestamp: new Date(props.time).toISOString()
                });
            }

            await this.log(`Found ${evidence.length} USGS results`, { count: evidence.length });
            return { success: true, evidence };

        } catch (error) {
            await this.logError('USGS search failed', error);
            return { success: false, evidence: [], error: String(error) };
        }
    }
}
