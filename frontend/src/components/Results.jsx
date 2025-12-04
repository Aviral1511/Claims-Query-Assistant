import React from 'react';

export default function Results({ data, onSelect }) {
    if (!data) return null;
    if (data.items && data.items.length) {
        return (
            <div>
                <h3 className="font-medium">Top matches</h3>
                <ul className="mt-2 space-y-2">
                    {data.items.map(it => (
                        <li key={it._id} className="p-3 border rounded flex justify-between items-center">
                            <div>
                                <div className="font-semibold">{it.claim_number} — {it.patient_name}</div>
                                <div className="text-sm text-gray-600">{it.status} • ₹{it.amount} • {new Date(it.submitted_at).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <button onClick={() => onSelect(it._id)} className="px-3 py-1 bg-gray-800 text-white rounded">Details</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
    if (data.claim) {
        const it = data.claim;
        return (
            <div className="p-3 border rounded">
                <div className="font-semibold">{it.claim_number} — {it.patient_name}</div>
                <div className="text-sm text-gray-600">{it.status} • ₹{it.amount}</div>
                <div className="mt-2">
                    <button onClick={() => onSelect(it._id)} className="px-3 py-1 bg-gray-800 text-white rounded cursor-pointer">Details</button>
                </div>
            </div>
        );
    }
    return <div className="text-gray-600">{data.text}</div>;
}
