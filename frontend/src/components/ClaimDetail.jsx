import React from 'react';

export default function ClaimDetail({ payload, onClose }) {
    if (!payload) return null;
    const { claim, events } = payload;
    return (
        <div className="border rounded p-4 bg-gray-50">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-semibold">{claim.claim_number} — {claim.patient_name}</h3>
                    <div className="text-sm text-gray-600">{claim.status} • ₹{claim.amount}</div>
                </div>
                <button onClick={onClose} className="text-sm text-blue-600 cursor-pointer">Close</button>
            </div>
            <div className="mt-3">
                <p><strong>Policy:</strong> {claim.policy_number}</p>
                <p><strong>Submitted:</strong> {new Date(claim.submitted_at).toLocaleString()}</p>
                <p><strong>Denial:</strong> {claim.denial_code || 'N/A'} — {claim.denial_reason || 'N/A'}</p>
                <p className="mt-2"><strong>Notes:</strong> {claim.notes}</p>
            </div>

            <div className="mt-4">
                <h4 className="font-medium">Events</h4>
                <ul className="mt-2 space-y-2">
                    {events && events.length ? events.map(ev => (
                        <li key={ev._id} className="p-2 border rounded bg-white">
                            <div className="text-sm">{ev.event_type} — {new Date(ev.created_at).toLocaleString()}</div>
                            <div className="text-xs text-gray-600">{JSON.stringify(ev.event_data)}</div>
                        </li>
                    )) : <li className="text-gray-600">No events</li>}
                </ul>
            </div>
        </div>
    );
}
