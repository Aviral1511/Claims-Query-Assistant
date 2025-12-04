// import React from 'react';

// export default function Results({ data, onSelect }) {
//     if (!data) return null;
//     if (data.items && data.items.length) {
//         return (
//             <div>
//                 <h3 className="font-medium">Top matches</h3>
//                 <ul className="mt-2 space-y-2">
//                     {data.items.map(it => (
//                         <li key={it._id} className="p-3 border rounded flex justify-between items-center">
//                             <div>
//                                 <div className="font-semibold">{it.claim_number} — {it.patient_name}</div>
//                                 <div className="text-sm text-gray-600">{it.status} • ₹{it.amount} • {new Date(it.submitted_at).toLocaleDateString()}</div>
//                             </div>
//                             <div>
//                                 <button onClick={() => onSelect(it._id)} className="px-3 py-1 bg-gray-800 text-white rounded">Details</button>
//                             </div>
//                         </li>
//                     ))}
//                 </ul>
//             </div>
//         );
//     }
//     if (data.claim) {
//         const it = data.claim;
//         return (
//             <div className="p-3 border rounded">
//                 <div className="font-semibold">{it.claim_number} — {it.patient_name}</div>
//                 <div className="text-sm text-gray-600">{it.status} • ₹{it.amount}</div>
//                 <div className="text-sm text-gray-500">Confidence: {(it.confidence || 0).toFixed(2)}</div>
//                 <div className="mt-2">
//                     <button onClick={() => onSelect(it._id)} className="px-3 py-1 bg-gray-800 text-white rounded cursor-pointer">Details</button>
//                 </div>
//             </div>
//         );
//     }
//     return <div className="text-gray-600">{data.text}</div>;
// }


// frontend/src/components/Results.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';

export default function Results({ data, onSelect, queryText }) {
    const [rephrasing, setRephrasing] = useState(false);
    const [polished, setPolished] = useState(null);

    async function handleRephrase(originalText) {
        if (!originalText) return;
        setRephrasing(true);
        try {
            const r = await fetch('/api/rephrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: originalText })
            });
            const j = await r.json();
            setPolished(j.text || originalText);
            toast.success('Response rephrased successfully');
        } catch (e) {
            console.error(e);
            toast.error('Failed to rephrase the response');
            setPolished(originalText);
        } finally {
            setRephrasing(false);
        }
    }

    if (!data) return null;

    // Single claim templated response
    if (data.text && data.claim) {
        const displayed = polished || data.text;
        return (
            <div className="p-3 border rounded">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-semibold text-lg">{data.claim.claim_number} — {data.claim.patient_name}</div>
                        <div className="text-sm text-gray-600">{data.claim.status} • ₹{data.claim.amount}</div>
                        <div className="text-xs text-gray-500 mt-1">Policy: {data.claim.policy_number}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div>
                            <button onClick={() => onSelect(data.claim._id)} className="px-3 py-1 bg-gray-800 text-white rounded mr-2 cursor-pointer">Details</button>
                            <button onClick={() => handleRephrase(data.text)} disabled={rephrasing} className="px-3 py-1 bg-blue-600 text-white rounded cursor-pointer">
                                {rephrasing ? 'Rephrasing…' : 'Rephrase'}
                            </button>
                        </div>
                        <div className="text-xs text-gray-500">
                            {data.latency_ms ? <>Response: {data.latency_ms} ms</> : null}
                            {data.confidence !== undefined ? <><span className="mx-2">•</span>Confidence: {(data.confidence || 0).toFixed(2)}</> : null}
                        </div>
                    </div>
                </div>

                <div className="mt-3 text-gray-800">{displayed}</div>
            </div>
        );
    }

    // List of item matches
    if (data.items && data.items.length) {
        return (
            <div>
                <h3 className="font-medium">Top matches</h3>
                <ul className="mt-2 space-y-2">
                    {data.items.map(it => (
                        <li key={it._id} className="p-3 border rounded flex justify-between items-center">
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold">{it.claim_number} — {it.patient_name}</div>
                                        <div className="text-sm text-gray-600">{it.status} • ₹{it.amount} • {new Date(it.submitted_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="text-xs text-gray-500 ml-4">Confidence: {(it.confidence || 0).toFixed(2)}</div>
                                </div>
                                <div className="mt-2 text-sm text-gray-700">
                                    {/* snippet rendering handled elsewhere or inline */}
                                    <Snippet note={it.notes} query={queryText} />
                                </div>
                            </div>

                            <div className="ml-4 flex flex-col items-end gap-2">
                                <button onClick={() => onSelect(it._id)} className="px-3 py-1 bg-gray-800 text-white rounded cursor-pointer">Details</button>
                                {/* <CopyButton text={it.claim_number} /> */}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    // Fallback single message
    return <div className="text-gray-600">{data.text}</div>;
}

/* Helper: snippet renderer */
function Snippet({ note = '', query = '' }) {
    const raw = snippetFor(note, query);
    return <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: raw }} />;
}

/* Helper: Copy button */
function CopyButton({ text }) {
    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            // small feedback - replace with toast if you have one
            alert(`Copied ${text}`);
        } catch (e) {
            console.error('copy failed', e);
        }
    }
    return (
        <button onClick={copy} className="px-2 py-1 text-xs border rounded bg-white">
            Copy
        </button>
    );
}

/* Snippet logic: returns HTML with <mark> around matched query */
function snippetFor(note = '', query = '') {
    if (!note) return '';
    const q = (query || '').trim();
    const maxLen = 140;
    const lowerNote = note.toLowerCase();
    const lowerQ = q.toLowerCase();
    let snippet = note.slice(0, maxLen);
    if (q && lowerNote.includes(lowerQ)) {
        const idx = lowerNote.indexOf(lowerQ);
        const start = Math.max(0, idx - 30);
        snippet = note.slice(start, Math.min(note.length, start + maxLen));
        // escape HTML (basic)
        const escaped = escapeHtml(snippet);
        const re = new RegExp(escapeRegExp(q), 'ig');
        return escaped.replace(re, match => `<mark>${match}</mark>`);
    }
    return escapeHtml(snippet);
}

function escapeHtml(str = '') {
    return str.replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
