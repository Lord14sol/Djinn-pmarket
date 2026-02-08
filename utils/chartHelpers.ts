
import { ChartDataPoint } from '@/components/market/TheDjinnChart';

/**
 * Genera datos de ejemplo para testing
 */
export function generateMockChartData(
    outcomes: string[],
    days: number = 30,
    intervalMinutes: number = 60
): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    const now = Date.now();
    const startTime = now - (days * 24 * 60 * 60 * 1000);
    const interval = intervalMinutes * 60 * 1000;

    // Valores iniciales aleatorios
    const initialValues: { [key: string]: number } = {};
    outcomes.forEach((outcome, idx) => {
        initialValues[outcome] = 100 / outcomes.length; // Distribuir equitativamente
    });

    for (let time = startTime; time <= now; time += interval) {
        const point: ChartDataPoint = { time };

        // Generar valores con tendencia aleatoria
        outcomes.forEach((outcome, idx) => {
            const lastValue = data.length > 0 ? data[data.length - 1][outcome] : initialValues[outcome];
            // Cambio aleatorio pequeño
            const change = (Math.random() - 0.5) * 5;
            point[outcome] = Math.max(5, Math.min(95, lastValue + change));
        });

        // Normalizar para que sumen 100
        const total = outcomes.reduce((sum, outcome) => sum + point[outcome], 0);
        outcomes.forEach(outcome => {
            point[outcome] = (point[outcome] / total) * 100;
        });

        data.push(point);
    }

    return data;
}

/**
 * Interpola datos para llenar gaps
 */
export function interpolateGaps(
    data: ChartDataPoint[],
    maxGapMs: number = 60 * 60 * 1000 // 1 hora
): ChartDataPoint[] {
    if (data.length < 2) return data;

    const result: ChartDataPoint[] = [data[0]];

    for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1];
        const curr = data[i];
        const gap = curr.time - prev.time;

        // Si hay un gap grande, interpolar
        if (gap > maxGapMs) {
            const steps = Math.floor(gap / maxGapMs);
            const stepSize = gap / (steps + 1);

            for (let j = 1; j <= steps; j++) {
                const interpolatedPoint: ChartDataPoint = {
                    time: prev.time + (stepSize * j)
                };

                // Interpolar valores linealmente
                Object.keys(prev).forEach(key => {
                    if (key !== 'time') {
                        const prevValue = prev[key];
                        const currValue = curr[key];
                        const ratio = j / (steps + 1);
                        interpolatedPoint[key] = prevValue + (currValue - prevValue) * ratio;
                    }
                });

                result.push(interpolatedPoint);
            }
        }

        result.push(curr);
    }

    return result;
}

/**
 * Resample data para reducir puntos (útil para timeframes grandes)
 */
export function resampleData(
    data: ChartDataPoint[],
    targetPoints: number = 100
): ChartDataPoint[] {
    if (data.length <= targetPoints) return data;

    const step = Math.floor(data.length / targetPoints);
    const resampled: ChartDataPoint[] = [];

    for (let i = 0; i < data.length; i += step) {
        // Promediar los siguientes 'step' puntos
        const chunk = data.slice(i, Math.min(i + step, data.length));
        const avgPoint: ChartDataPoint = { time: chunk[chunk.length - 1].time };

        const keys = Object.keys(chunk[0]).filter(k => k !== 'time');
        keys.forEach(key => {
            avgPoint[key] = chunk.reduce((sum, point) => sum + point[key], 0) / chunk.length;
        });

        resampled.push(avgPoint);
    }

    return resampled;
}

/**
 * Calcula volatilidad de un outcome
 */
export function calculateVolatility(
    data: ChartDataPoint[],
    outcome: string,
    windowSize: number = 10
): number {
    if (data.length < windowSize) return 0;

    const recent = data.slice(-windowSize);
    const values = recent.map(d => d[outcome]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
}

/**
 * Detecta tendencias (alcista, bajista, lateral)
 */
export function detectTrend(
    data: ChartDataPoint[],
    outcome: string,
    windowSize: number = 20
): 'bullish' | 'bearish' | 'sideways' {
    if (data.length < windowSize) return 'sideways';

    const recent = data.slice(-windowSize);
    const firstValue = recent[0][outcome];
    const lastValue = recent[recent.length - 1][outcome];
    const change = lastValue - firstValue;
    const changePercent = (change / firstValue) * 100;

    if (changePercent > 5) return 'bullish';
    if (changePercent < -5) return 'bearish';
    return 'sideways';
}

/**
 * Calcula el precio implícito basado en probabilidad
 */
export function probabilityToPrice(probability: number, maxPrice: number = 1): number {
    return (probability / 100) * maxPrice;
}

/**
 * Calcula la probabilidad basada en precio
 */
export function priceToProbability(price: number, maxPrice: number = 1): number {
    return (price / maxPrice) * 100;
}

/**
 * Formatea números grandes
 */
export function formatLargeNumber(num: number): string {
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`;
    } else if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toFixed(2);
}

/**
 * Calcula el cambio porcentual entre dos valores
 */
export function calculatePercentChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Encuentra el valor máximo en un rango de tiempo
 */
export function findMaxInRange(
    data: ChartDataPoint[],
    outcome: string,
    startTime: number,
    endTime: number
): number {
    const filtered = data.filter(d => d.time >= startTime && d.time <= endTime);
    if (filtered.length === 0) return 0;
    return Math.max(...filtered.map(d => d[outcome]));
}

/**
 * Encuentra el valor mínimo en un rango de tiempo
 */
export function findMinInRange(
    data: ChartDataPoint[],
    outcome: string,
    startTime: number,
    endTime: number
): number {
    const filtered = data.filter(d => d.time >= startTime && d.time <= endTime);
    if (filtered.length === 0) return 0;
    return Math.min(...filtered.map(d => d[outcome]));
}

/**
 * Valida que los datos sean correctos
 */
export function validateChartData(
    data: ChartDataPoint[],
    outcomes: string[]
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
        errors.push('Data must be an array');
        return { valid: false, errors };
    }

    if (data.length === 0) {
        errors.push('Data array is empty');
        return { valid: false, errors };
    }

    data.forEach((point, idx) => {
        // Verificar que tenga timestamp
        if (typeof point.time !== 'number') {
            errors.push(`Point ${idx}: missing or invalid 'time' field`);
        }

        // Verificar que tenga todos los outcomes
        outcomes.forEach(outcome => {
            if (typeof point[outcome] !== 'number') {
                errors.push(`Point ${idx}: missing or invalid outcome '${outcome}'`);
            } else if (point[outcome] < 0 || point[outcome] > 100) {
                errors.push(`Point ${idx}: outcome '${outcome}' out of range (${point[outcome]})`);
            }
        });

        // Verificar que sumen aproximadamente 100
        const sum = outcomes.reduce((acc, outcome) => acc + (point[outcome] || 0), 0);
        if (Math.abs(sum - 100) > 1) {
            errors.push(`Point ${idx}: outcomes don't sum to 100 (sum: ${sum})`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Limpia y normaliza datos
 */
export function cleanChartData(
    data: ChartDataPoint[],
    outcomes: string[]
): ChartDataPoint[] {
    return data.map(point => {
        const cleaned: ChartDataPoint = { time: point.time };

        // Asegurar que todos los outcomes existan
        outcomes.forEach(outcome => {
            cleaned[outcome] = point[outcome] || 0;
        });

        // Normalizar para que sumen 100
        const sum = outcomes.reduce((acc, outcome) => acc + cleaned[outcome], 0);
        if (sum > 0) {
            outcomes.forEach(outcome => {
                cleaned[outcome] = (cleaned[outcome] / sum) * 100;
            });
        } else {
            // Si todos son 0, distribuir equitativamente
            outcomes.forEach(outcome => {
                cleaned[outcome] = 100 / outcomes.length;
            });
        }

        return cleaned;
    });
}

/**
 * Exporta datos a CSV
 */
export function exportToCSV(data: ChartDataPoint[], filename: string = 'chart-data.csv'): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => row[header]).join(',')
        )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}
