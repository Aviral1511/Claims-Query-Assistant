// frontend/src/components/Results.jsx
import React from 'react';

export default function Results({ data, onSelect }) {
    if (!data) return null;

    // Single-claim response
    if (data.text && data.claim) {
        const c = data.claim;
        return (
            <div className="p-3 border rounded">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-semibold text-lg">{c.claim_number} — {c.patient_name}</div>
                        <div className="text-sm text-gray-600">{c.status} • ₹{c.amount}</div>
                        <div className="text-xs text-gray-500 mt-1">Policy: {c.policy_number}</div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                        {data.latency_ms != null && <div>Response: {data.latency_ms} ms</div>}
                        {data.confidence_level && (
                            <div>
                                Confidence: <ConfidenceBadge level={data.confidence_level} />
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-3 text-gray-800">{data.text}</div>
                <div className="mt-3 flex justify-end">
                    <button onClick={() => onSelect(c._id)} className="px-3 py-1 bg-gray-800 text-white rounded">
                        Details
                    </button>
                </div>
            </div>
        );
    }

    // List of matches
    if (data.items && data.items.length) {
        const summary = data.summary || {};
        const hints = data.query_hints || {};
        const statusDist = summary.statusDistribution || {};

        return (
            <div className="space-y-3">
                {/* Top info bar */}
                <div className="flex justify-between items-center">
                    <div>
                        <div className="font-medium">Found {summary.totalClaims ?? data.items.length} matching claims</div>
                        <div className="text-sm text-gray-600">
                            Total amount: ₹{(summary.totalAmount || 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                        {data.latency_ms != null && <div>Response: {data.latency_ms} ms</div>}
                        {data.confidence_level && (
                            <div>
                                Confidence: <ConfidenceBadge level={data.confidence_level} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Interpreted query hints */}
                {(hints.status || hints.time) && (
                    <div className="text-xs text-gray-700">
                        <span className="font-semibold mr-1">Interpreted filters:</span>
                        {hints.status && <span className="inline-block px-2 py-0.5 mr-1 rounded bg-blue-50 border border-blue-200">Status: {hints.status}</span>}
                        {hints.time && <span className="inline-block px-2 py-0.5 mr-1 rounded bg-green-50 border border-green-200">Time: {hints.time.replace('_', ' ')}</span>}
                    </div>
                )}

                {/* Status distribution */}
                {Object.keys(statusDist).length > 0 && (
                    <div className="text-xs text-gray-700">
                        <span className="font-semibold mr-1">Status breakdown:</span>
                        {Object.entries(statusDist).map(([st, cnt]) => (
                            <span key={st} className="inline-block px-2 py-0.5 mr-1 rounded bg-gray-50 border border-gray-200">
                                {st}: {cnt}
                            </span>
                        ))}
                    </div>
                )}

                {/* List items */}
                <ul className="mt-2 space-y-2">
                    {data.items.map(it => (
                        <li key={it._id} className="p-3 border rounded flex justify-between items-center">
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold">{it.claim_number} — {it.patient_name}</div>
                                        <div className="text-sm text-gray-600">
                                            {it.status} • ₹{it.amount} • {it.submitted_at ? new Date(it.submitted_at).toLocaleDateString() : ''}
                                        </div>
                                    </div>
                                    {typeof it.confidence === 'number' && (
                                        <div className="text-xs text-gray-500 ml-4">
                                            Match score: {(it.confidence || 0).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                    {it.notes}
                                </div>
                            </div>

                            <div className="ml-4 flex flex-col items-end gap-2">
                                <button onClick={() => onSelect(it._id)} className="px-3 py-1 bg-gray-800 text-white rounded cursor-pointer">
                                    Details
                                </button>
                                {/* <button
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(it.claim_number);
                                            alert(`Copied ${it.claim_number}`);
                                        } catch (e) { console.error(e); }
                                    }}
                                    className="px-2 py-1 text-xs border rounded bg-white"
                                >
                                    Copy ID
                                </button> */}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    // Fallback message
    return <div className="text-gray-600">{data.text}</div>;
}

function ConfidenceBadge({ level }) {
    const cls =
        level === 'HIGH'
            ? 'bg-green-100 text-green-800 border border-green-300'
            : level === 'MEDIUM'
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : 'bg-red-100 text-red-800 border border-red-300';
    return <span className={`px-2 py-0.5 rounded text-[11px] ${cls}`}>{level}</span>;
}

