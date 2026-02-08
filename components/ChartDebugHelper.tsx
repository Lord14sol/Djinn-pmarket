
import React from 'react';

interface DebugHelperProps {
    data: any[];
    outcomeNames: string[];
    outcomeColors: string[];
    marketAccount: any;
}

export function ChartDebugHelper({
    data,
    outcomeNames,
    outcomeColors,
    marketAccount
}: DebugHelperProps) {

    const checks = [
        {
            name: 'Data exists',
            status: data && data.length > 0,
            value: data ? `${data.length} points` : 'No data',
            fix: 'Ensure historyState.probability has data from your database'
        },
        {
            name: 'Outcome names match',
            status: data && data.length > 0 && outcomeNames.every(name =>
                data[0].hasOwnProperty(name)
            ),
            value: outcomeNames.join(', '),
            fix: 'Ensure outcome names match exactly the keys in your data'
        },
        {
            name: 'Colors provided',
            status: outcomeColors && outcomeColors.length >= outcomeNames.length,
            value: `${outcomeColors?.length || 0} colors for ${outcomeNames?.length || 0} outcomes`,
            fix: 'Provide at least one color per outcome'
        },
        {
            name: 'Valid timestamps',
            status: data && data.length > 0 && data.every(d =>
                d.time && typeof d.time === 'number' && d.time > 0
            ),
            value: data && data.length > 0 ? `${new Date(data[0].time).toLocaleString()}` : 'N/A',
            fix: 'Ensure each data point has a valid "time" field (timestamp in milliseconds)'
        },
        {
            name: 'Valid probability values',
            status: data && data.length > 0 && outcomeNames.every(name => {
                const val = data[0][name];
                return typeof val === 'number' && val >= 0 && val <= 100;
            }),
            value: data && data.length > 0 ? JSON.stringify(
                outcomeNames.reduce((acc, name) => ({ ...acc, [name]: data[0][name] }), {})
            ) : 'N/A',
            fix: 'Ensure probability values are numbers between 0 and 100'
        }
    ];

    const allPassed = checks.every(check => check.status);

    return (
        <div className="fixed top-4 right-4 bg-white border-4 border-blue-500 rounded-lg p-6 shadow-2xl max-w-2xl z-50">
            <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">🔍</div>
                <div>
                    <div className="text-xl font-bold">Chart Debug Report</div>
                    <div className="text-sm text-gray-600">
                        Status: {allPassed ? '✅ All checks passed' : '❌ Issues detected'}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {checks.map((check, idx) => (
                    <div
                        key={idx}
                        className={`p-3 rounded-lg border-2 ${check.status
                                ? 'bg-green-50 border-green-500'
                                : 'bg-red-50 border-red-500'
                            }`}
                    >
                        <div className="flex items-start gap-2">
                            <div className="text-2xl">{check.status ? '✅' : '❌'}</div>
                            <div className="flex-1">
                                <div className="font-bold text-gray-900">{check.name}</div>
                                <div className="text-sm text-gray-700 mt-1">
                                    Value: <code className="bg-gray-200 px-1 rounded">{check.value}</code>
                                </div>
                                {!check.status && (
                                    <div className="text-sm text-red-700 mt-2 font-semibold">
                                        🔧 Fix: {check.fix}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {data && data.length > 0 && (
                <details className="mt-4">
                    <summary className="font-bold cursor-pointer text-blue-600 hover:text-blue-800">
                        Show Sample Data (Click to expand)
                    </summary>
                    <div className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60">
                        <div className="font-bold mb-2">First Data Point:</div>
                        <pre>{JSON.stringify(data[0], null, 2)}</pre>
                        {data.length > 1 && (
                            <>
                                <div className="font-bold mb-2 mt-4">Last Data Point:</div>
                                <pre>{JSON.stringify(data[data.length - 1], null, 2)}</pre>
                            </>
                        )}
                    </div>
                </details>
            )}

            <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="font-bold text-blue-900 mb-1">💡 Quick Fixes:</div>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                    <li>Enable debug mode: <code className="bg-blue-200 px-1 rounded">debug={'{true}'}</code></li>
                    <li>Check browser console for detailed logs</li>
                    <li>Verify data format matches expected structure</li>
                    <li>Ensure outcome names are exact matches (case-sensitive)</li>
                </ul>
            </div>

            <div className="mt-3 text-xs text-gray-500 text-center">
                Remove this component once issues are resolved
            </div>
        </div>
    );
}
