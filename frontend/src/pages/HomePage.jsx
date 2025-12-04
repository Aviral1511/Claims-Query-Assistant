import React, { useState } from 'react';
import QueryBox from '../components/QueryBox';
import Results from '../components/Results';
import ClaimDetail from '../components/ClaimDetail';

const HomePage = () => {
    const [response, setResponse] = useState(null);
    const [selected, setSelected] = useState(null);
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto bg-white shadow rounded p-6">
                <h1 className="text-2xl font-semibold mb-4">Claims Query — MVP</h1>
                <QueryBox onAnswer={setResponse} />
                <div className="mt-4">
                    <Results data={response} onSelect={async (claimId) => {
                        const r = await fetch(`http://localhost:4000/api/claims/${claimId}`);
                        const json = await r.json();
                        setSelected(json);
                    }} />
                </div>
                {selected && <div className="mt-6"><ClaimDetail payload={selected} onClose={() => setSelected(null)} /></div>}
            </div>
        </div>
    )
}

export default HomePage
