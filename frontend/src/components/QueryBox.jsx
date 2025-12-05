
import React, { useState, useRef, useEffect } from 'react';

export default function QueryBox({ onAnswer }) {
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef();

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    async function submit() {
        if (!q || q.trim().length < 1) return;
        setLoading(true);
        try {
            const r = await fetch('http://localhost:4000/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: q })
            });
            const json = await r.json();
            onAnswer(json);
        } catch (e) {
            console.error(e);
            onAnswer({ text: 'Error calling API' });
        } finally {
            setLoading(false);
        }
    }

    // NEW: Show all claims
    async function showAll() {
        setLoading(true);
        try {
            const r = await fetch('http://localhost:4000/api/claims/list?limit=30');
            const json = await r.json();
            onAnswer(json);
        } catch (e) {
            console.error(e);
            onAnswer({ text: 'Error loading claims list' });
        } finally {
            setLoading(false);
        }
    }

    function onKeyDown(e) {
        if (e.key === 'Enter') submit();
    }

    return (
        <div>
            <div className="flex gap-2">
                <input
                    ref={inputRef}
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask about claims, or search by CLM-####"
                    className="flex-1 border rounded p-2"
                />
                <button
                    onClick={submit}
                    disabled={loading}
                    className="px-4 py-2 rounded bg-blue-600 text-white cursor-pointer"
                >
                    {loading ? 'Loading…' : 'Ask'}
                </button>
                <button
                    onClick={showAll}
                    disabled={loading}
                    className="px-3 py-2 rounded border bg-white text-sm cursor-pointer"
                >
                    Show all
                </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
                Tip: Try <code>show me denied claims last year</code> or click “Show all” to browse.
            </p>
        </div>
    );
}

