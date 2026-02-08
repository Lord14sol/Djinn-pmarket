
/**
 * Formato esperado por TheDjinnChart:
 * {
 *   time: number (milliseconds),
 *   [outcomeName]: number (0-100)
 * }
 */

export interface ChartDataPoint {
    time: number;
    [outcome: string]: number;
}

// ==========================================
// TRANSFORMADORES PARA DIFERENTES FORMATOS
// ==========================================

/**
 * Caso 1: Probabilidades en decimal (0-1)
 * Input: { timestamp: 1707404720, yes: 0.655, no: 0.345 }
 * Output: { time: 1707404720000, YES: 65.5, NO: 34.5 }
 */
export function transformDecimalProbabilities(
    data: any[],
    outcomeMapping: Record<string, string> // ej: { 'yes': 'YES', 'no': 'NO' }
): ChartDataPoint[] {
    return data.map(point => {
        const transformed: ChartDataPoint = {
            time: ensureMilliseconds(point.timestamp || point.time)
        };

        Object.entries(outcomeMapping).forEach(([dbKey, chartKey]) => {
            const value = point[dbKey];
            transformed[chartKey] = typeof value === 'number' ? value * 100 : 0;
        });

        return transformed;
    });
}

/**
 * Caso 2: Probabilidades en basis points (0-10000)
 * Input: { timestamp: 1707404720, yes: 6550, no: 3450 }
 * Output: { time: 1707404720000, YES: 65.5, NO: 34.5 }
 */
export function transformBasisPoints(
    data: any[],
    outcomeMapping: Record<string, string>
): ChartDataPoint[] {
    return data.map(point => {
        const transformed: ChartDataPoint = {
            time: ensureMilliseconds(point.timestamp || point.time)
        };

        Object.entries(outcomeMapping).forEach(([dbKey, chartKey]) => {
            const value = point[dbKey];
            transformed[chartKey] = typeof value === 'number' ? value / 100 : 0;
        });

        return transformed;
    });
}

/**
 * Caso 3: Datos anidados con metadata
 * Input: { created_at: '2024-02-08T12:00:00Z', probabilities: { yes: 65.5, no: 34.5 } }
 * Output: { time: 1707404720000, YES: 65.5, NO: 34.5 }
 */
export function transformNestedProbabilities(
    data: any[],
    timestampKey: string,
    probabilitiesKey: string,
    outcomeMapping: Record<string, string>
): ChartDataPoint[] {
    return data.map(point => {
        const transformed: ChartDataPoint = {
            time: parseTimestamp(point[timestampKey])
        };

        const probs = point[probabilitiesKey] || {};
        Object.entries(outcomeMapping).forEach(([dbKey, chartKey]) => {
            transformed[chartKey] = probs[dbKey] || 0;
        });

        return transformed;
    });
}

/**
 * Caso 4: Array de outcomes con diferentes estructuras
 * Input: { timestamp: 1707404720, outcomes: [{ name: 'YES', probability: 65.5 }, ...] }
 * Output: { time: 1707404720000, YES: 65.5, NO: 34.5 }
 */
export function transformOutcomesArray(
    data: any[],
    timestampKey: string = 'timestamp',
    outcomesKey: string = 'outcomes'
): ChartDataPoint[] {
    return data.map(point => {
        const transformed: ChartDataPoint = {
            time: ensureMilliseconds(point[timestampKey])
        };

        const outcomes = point[outcomesKey] || [];
        outcomes.forEach((outcome: any) => {
            const name = outcome.name || outcome.title || outcome.outcome;
            const prob = outcome.probability || outcome.prob || outcome.value;
            if (name && typeof prob === 'number') {
                transformed[name] = prob;
            }
        });

        return transformed;
    });
}

/**
 * Caso 5: Formato Polymarket
 * Input: { t: 1707404720, p: 0.655 } para cada outcome
 * Output: { time: 1707404720000, YES: 65.5, NO: 34.5 }
 */
export function transformPolymarketFormat(
    dataByOutcome: Record<string, Array<{ t: number; p: number }>>,
    outcomeNames: string[]
): ChartDataPoint[] {
    // Obtener todos los timestamps únicos
    const allTimestamps = new Set<number>();
    Object.values(dataByOutcome).forEach(points => {
        points.forEach(p => allTimestamps.add(p.t));
    });

    const timestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Crear un punto por timestamp
    return timestamps.map(timestamp => {
        const point: ChartDataPoint = {
            time: ensureMilliseconds(timestamp)
        };

        outcomeNames.forEach(outcome => {
            const outcomeData = dataByOutcome[outcome] || [];
            const dataPoint = outcomeData.find(p => p.t === timestamp);
            point[outcome] = dataPoint ? dataPoint.p * 100 : 0;
        });

        return point;
    });
}

/**
 * Caso 6: Datos de Firestore/MongoDB
 * Input: { _id: '...', timestamp: { _seconds: 1707404720 }, probabilities: {...} }
 */
export function transformFirestoreData(
    data: any[],
    outcomeMapping: Record<string, string>
): ChartDataPoint[] {
    return data.map(doc => {
        const transformed: ChartDataPoint = {
            time: doc.timestamp?._seconds
                ? doc.timestamp._seconds * 1000
                : parseTimestamp(doc.timestamp || doc.created_at || doc.time)
        };

        const probs = doc.probabilities || doc.probs || doc;
        Object.entries(outcomeMapping).forEach(([dbKey, chartKey]) => {
            transformed[chartKey] = probs[dbKey] || 0;
        });

        return transformed;
    });
}

/**
 * Caso 7: Datos de GraphQL
 * Input: { node: { timestamp: '...', outcomes: { edges: [...] } } }
 */
export function transformGraphQLData(
    data: any[],
    outcomeNames: string[]
): ChartDataPoint[] {
    return data.map(item => {
        const node = item.node || item;
        const transformed: ChartDataPoint = {
            time: parseTimestamp(node.timestamp || node.createdAt)
        };

        const outcomes = node.outcomes?.edges || node.outcomes || [];
        outcomes.forEach((outcome: any) => {
            const outcomeNode = outcome.node || outcome;
            const name = outcomeNode.name || outcomeNode.title;
            const prob = outcomeNode.probability || outcomeNode.value;

            if (outcomeNames.includes(name) && typeof prob === 'number') {
                transformed[name] = prob;
            }
        });

        return transformed;
    });
}

// ==========================================
// UTILIDADES HELPER
// ==========================================

/**
 * Asegura que un timestamp esté en milliseconds
 */
function ensureMilliseconds(timestamp: number | string): number {
    if (typeof timestamp === 'string') {
        return new Date(timestamp).getTime();
    }

    // Si es menor a 10^10, probablemente está en segundos
    if (timestamp < 10000000000) {
        return timestamp * 1000;
    }

    return timestamp;
}

/**
 * Parsea diferentes formatos de timestamp
 */
function parseTimestamp(timestamp: any): number {
    if (typeof timestamp === 'number') {
        return ensureMilliseconds(timestamp);
    }

    if (typeof timestamp === 'string') {
        return new Date(timestamp).getTime();
    }

    if (timestamp instanceof Date) {
        return timestamp.getTime();
    }

    // Formato Firestore
    if (timestamp?._seconds) {
        return timestamp._seconds * 1000;
    }

    return Date.now();
}

/**
 * Valida y limpia datos transformados
 */
export function validateAndCleanData(
    data: ChartDataPoint[],
    outcomeNames: string[]
): ChartDataPoint[] {
    return data
        .filter(point => {
            // Filtrar puntos sin timestamp válido
            if (!point.time || isNaN(point.time)) {
                console.warn('⚠️ Skipping point without valid timestamp:', point);
                return false;
            }
            return true;
        })
        .map(point => {
            const cleaned: ChartDataPoint = { time: point.time };

            // Asegurar que todos los outcomes existan
            outcomeNames.forEach(outcome => {
                const value = point[outcome];
                cleaned[outcome] = typeof value === 'number' && !isNaN(value)
                    ? Math.max(0, Math.min(100, value)) // Clamp entre 0-100
                    : 0;
            });

            // Normalizar para que sumen 100
            const sum = outcomeNames.reduce((acc, name) => acc + cleaned[name], 0);
            if (sum > 0 && Math.abs(sum - 100) > 1) {
                outcomeNames.forEach(name => {
                    cleaned[name] = (cleaned[name] / sum) * 100;
                });
            }

            return cleaned;
        })
        .sort((a, b) => a.time - b.time); // Ordenar por tiempo
}

// ==========================================
// FUNCIÓN GENÉRICA AUTO-DETECTORA
// ==========================================

/**
 * Intenta detectar automáticamente el formato y transformar
 */
export function autoTransformData(
    data: any[],
    outcomeNames: string[]
): ChartDataPoint[] {
    if (!data || data.length === 0) {
        console.warn('⚠️ No data to transform');
        return [];
    }

    const sample = data[0];

    console.log('🔍 Auto-detecting data format...');
    console.log('Sample:', sample);

    // Intenta diferentes formatos
    try {
        // Ya está en el formato correcto
        if (sample.time && outcomeNames.every(name => name in sample)) {
            console.log('✅ Data already in correct format');
            return validateAndCleanData(data, outcomeNames);
        }

        // Formato anidado
        if (sample.probabilities || sample.probs) {
            console.log('📦 Detected nested probabilities format');
            const mapping = outcomeNames.reduce((acc, name) => {
                acc[name.toLowerCase()] = name;
                return acc;
            }, {} as Record<string, string>);

            return validateAndCleanData(
                transformNestedProbabilities(data, 'timestamp', 'probabilities', mapping),
                outcomeNames
            );
        }

        // Formato con array de outcomes
        if (sample.outcomes && Array.isArray(sample.outcomes)) {
            console.log('📊 Detected outcomes array format');
            return validateAndCleanData(
                transformOutcomesArray(data),
                outcomeNames
            );
        }

        // Intenta mapeo simple basado en nombres
        console.log('🔄 Attempting simple mapping...');
        const mapping: Record<string, string> = {};

        outcomeNames.forEach(name => {
            const possibleKeys = [
                name,
                name.toLowerCase(),
                name.toUpperCase(),
                name.replace(/\s+/g, '_'),
                name.replace(/\s+/g, '-')
            ];

            for (const key of possibleKeys) {
                if (key in sample) {
                    mapping[key] = name;
                    break;
                }
            }
        });

        if (Object.keys(mapping).length === outcomeNames.length) {
            console.log('✅ Found mapping:', mapping);
            return validateAndCleanData(
                transformDecimalProbabilities(data, mapping),
                outcomeNames
            );
        }

        console.error('❌ Could not auto-detect format');
        console.log('Available keys:', Object.keys(sample));
        console.log('Expected outcomes:', outcomeNames);

    } catch (error) {
        console.error('❌ Error transforming data:', error);
    }

    return [];
}
