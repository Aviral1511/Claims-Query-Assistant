import React, { useState } from 'react';

export default function QueryBox({ onAnswer }) {
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(false);
    async function submit() {
        setLoading(true);
        try {
            const r = await fetch('http://localhost:4000/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: q }) });
            const json = await r.json();
            onAnswer(json);
        } catch (e) {
            onAnswer({ text: 'Error calling API' });
        } finally { setLoading(false); }
    }
    return (
        <div>
            <div className="flex gap-2">
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="E.g. Claim CLM-2025-1001 or 'why was my claim denied?'" className="flex-1 border rounded p-2" />
                <button onClick={submit} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer">Ask</button>
            </div>
            <p className="text-sm text-gray-500 mt-2">Tip: try a claim number like <code>CLM-2025-1001</code> after seeding.</p>
        </div>
    );
}
