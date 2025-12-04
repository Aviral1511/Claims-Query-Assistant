// frontend/src/AdminPanel.jsx
import React, { useEffect, useState } from 'react';

export default function AdminPanel() {
  const [tab, setTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [templates, setTemplates] = useState({});
  const [editing, setEditing] = useState(false);
  const [tplText, setTplText] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    try {
      if (tab === 'logs') {
        const r = await fetch('/api/admin/logs?limit=100');
        const j = await r.json();
        setLogs(j.items || []);
      } else if (tab === 'templates') {
        const r = await fetch('/api/admin/templates');
        const j = await r.json();
        setTemplates(j.templates || {});
        setTplText(JSON.stringify(j.templates || {}, null, 2));
      } else if (tab === 'stats') {
        const r = await fetch('/api/admin/stats');
        const j = await r.json();
        setStats(j);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function saveTemplates() {
    try {
      const parsed = JSON.parse(tplText);
      const r = await fetch('/api/admin/templates', {
        method: 'PUT',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ templates: parsed })
      });
      const j = await r.json();
      if (j.ok) {
        alert('Templates saved to ' + j.path);
        setEditing(false);
        load();
      } else {
        alert('Save failed: ' + JSON.stringify(j));
      }
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
    }
  }

  return (
    <div className="max-w-4xl mx-auto my-6 p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-3">Admin Panel (Demo)</h2>
      <div className="flex gap-2 mb-4">
        <button className={`px-3 py-1 ${tab==='logs' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={()=>setTab('logs')}>Logs</button>
        <button className={`px-3 py-1 ${tab==='templates' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={()=>setTab('templates')}>Templates</button>
        <button className={`px-3 py-1 ${tab==='stats' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={()=>setTab('stats')}>Stats</button>
      </div>

      {loading && <div>Loading...</div>}

      {tab === 'logs' && (
        <div>
          <h3 className="font-medium">Recent Queries ({logs.length})</h3>
          <ul className="mt-2 space-y-2 max-h-96 overflow-auto">
            {logs.map(l => (
              <li key={l._id} className="p-2 border rounded">
                <div className="text-xs text-gray-500">{new Date(l.created_at).toLocaleString()} • {l.user_id} • {l.latency_ms || 0} ms</div>
                <div className="mt-1"><strong>Q:</strong> {l.text}</div>
                <div className="mt-1 text-sm"><strong>Resp:</strong> {l.response_text}</div>
                <div className="mt-1 text-xs text-gray-600">Matched IDs: { (l.matched_claim_ids || []).slice(0,5).join(', ') }</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'templates' && (
        <div>
          <h3 className="font-medium mb-2">Templates</h3>
          {!editing ? (
            <div>
              <pre className="p-3 border rounded bg-gray-50">{JSON.stringify(templates, null, 2)}</pre>
              <div className="mt-2">
                <button onClick={()=>setEditing(true)} className="px-3 py-1 bg-blue-600 text-white rounded">Edit (write templates.custom.js)</button>
              </div>
            </div>
          ) : (
            <div>
              <textarea value={tplText} onChange={e=>setTplText(e.target.value)} className="w-full h-64 border p-2" />
              <div className="mt-2 flex gap-2">
                <button onClick={saveTemplates} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                <button onClick={()=>setEditing(false)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div>
          <h3 className="font-medium">Stats</h3>
          <div className="mt-2">
            <div>Total queries: <strong>{stats?.total_queries ?? '—'}</strong></div>
            <div>Avg latency (recent): <strong>{stats?.avg_latency_ms ?? '—'} ms</strong></div>
            <div>Recent logs returned: <strong>{stats?.recent_count ?? '—'}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
