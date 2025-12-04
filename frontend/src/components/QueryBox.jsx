// frontend/src/components/QueryBox.jsx
import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';

export default function QueryBox({ onAnswer }) {
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef();

    useEffect(() => {
        // focus input on mount for demo-ready UX
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
            toast.success('Response received');
        } catch (e) {
            onAnswer({ text: 'Error calling API' });
            toast.error('Some error occured');
            console.error(e);
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
                    placeholder="E.g. CLM-2025-1001 or 'why was my claim denied?'"
                    className="flex-1 border rounded p-2"
                />
                <button
                    onClick={submit}
                    disabled={loading}
                    className="px-4 py-2 rounded bg-blue-600 text-white flex items-center cursor-pointer"
                >
                    {loading ? (
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeOpacity="0.3" />
                            <path d="M22 12a10 10 0 00-10-10" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
                        </svg>
                    ) : null}
                    {loading ? 'Searching…' : 'Ask'}
                </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">Tip: try <code>CLM-2025-1001</code> or <code>why was my claim denied</code></p>
        </div>
    );
}
