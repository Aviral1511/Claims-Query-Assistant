import React from 'react';

export default function ClaimDetail({ payload, onClose }) {
    if (!payload) return null;

    const { claim, events = [] } = payload;

    const provider = claim.provider || claim.metadata?.provider || 'Unknown provider';

    const formatDateTime = (value) => {
        if (!value) return 'N/A';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return 'N/A';
        return d.toLocaleString();
    };

    const formatDate = (value) => {
        if (!value) return 'N/A';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString();
    };

    const formatCurrency = (value) => {
        const amount = Number(value) || 0;
        try {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
            }).format(amount);
        } catch {
            return `₹${amount}`;
        }
    };

    const getStatusClasses = () => {
        const status = (claim.status || '').toUpperCase();
        if (status.includes('APPROVED')) {
            return 'bg-green-100 text-green-800 border border-green-200';
        }
        if (status.includes('DENIED') || status.includes('REJECT')) {
            return 'bg-red-100 text-red-800 border border-red-200';
        }
        if (status.includes('PENDING')) {
            return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
        }
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    };

    const hasDenialInfo = !!(claim.denial_code || claim.denial_reason);

    return (
        <div className="border rounded-2xl p-5 bg-gray-50 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                            {claim.claim_number}
                        </h3>
                        <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${getStatusClasses()}`}
                        >
                            {claim.status || 'UNKNOWN'}
                        </span>
                    </div>
                    <div className="text-sm text-gray-700">
                        <span className="font-medium">{claim.patient_name}</span>{' '}
                        <span className="text-gray-400 mx-1">•</span>
                        <span>{formatCurrency(claim.amount)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                            Policy: {claim.policy_number || 'N/A'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
                            Provider: {provider}
                        </span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="text-xs sm:text-sm px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                    ✕ Close
                </button>
            </div>

            {/* Main info grid */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Claim info */}
                <div className="space-y-2 text-sm text-gray-800">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Claim Details
                    </h4>
                    <div className="rounded-xl bg-white p-3 border border-gray-100 space-y-1.5">
                        <p>
                            <span className="font-medium text-gray-600">Submitted:</span>{' '}
                            {formatDate(claim.submitted_at)}
                        </p>
                        <p>
                            <span className="font-medium text-gray-600">Processed:</span>{' '}
                            {formatDate(claim.processed_at)}
                        </p>
                        <p>
                            <span className="font-medium text-gray-600">Created:</span>{' '}
                            {formatDateTime(claim.createdAt)}
                        </p>
                        <p>
                            <span className="font-medium text-gray-600">Last Updated:</span>{' '}
                            {formatDateTime(claim.updatedAt)}
                        </p>
                    </div>
                </div>

                {/* Denial / notes */}
                <div className="space-y-2 text-sm text-gray-800">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Denial & Notes
                    </h4>
                    <div className="rounded-xl bg-white p-3 border border-gray-100 space-y-2">
                        <div>
                            <p className="font-medium text-gray-600 mb-0.5">Denial Info</p>
                            {hasDenialInfo ? (
                                <p className="text-sm">
                                    <span className="font-semibold">Code:</span>{' '}
                                    {claim.denial_code || 'N/A'}
                                    <br />
                                    <span className="font-semibold">Reason:</span>{' '}
                                    {claim.denial_reason || 'N/A'}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-500 italic">
                                    No denial information for this claim.
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-gray-600 mb-0.5">Notes</p>
                            <p className="text-sm text-gray-800">
                                {claim.notes && claim.notes.trim().length
                                    ? claim.notes
                                    : 'No notes added yet.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Events timeline */}
            <div className="mt-5">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-800">
                        Events ({events.length || 0})
                    </h4>
                    {events.length > 0 && (
                        <span className="text-xs text-gray-500">
                            Showing most recent first
                        </span>
                    )}
                </div>

                <div className="mt-2">
                    {events && events.length ? (
                        <ul className="space-y-2">
                            {events
                                .slice() // copy
                                .sort(
                                    (a, b) =>
                                        new Date(b.created_at).getTime() -
                                        new Date(a.created_at).getTime()
                                )
                                .map((ev) => (
                                    <li
                                        key={ev._id}
                                        className="relative p-3 pl-4 border rounded-xl bg-white hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                                    >
                                        {/* Timeline dot */}
                                        <span className="absolute left-1 top-3 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        <div className="flex flex-wrap items-center justify-between gap-1">
                                            <span className="font-medium text-gray-800">
                                                {ev.event_type}
                                            </span>
                                            <span className="text-[11px] text-gray-500">
                                                {formatDateTime(ev.created_at)}
                                            </span>
                                        </div>
                                        {ev.event_data && (
                                            <div className="mt-1 text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 break-words">
                                                {typeof ev.event_data === 'string'
                                                    ? ev.event_data
                                                    : JSON.stringify(ev.event_data, null, 2)}
                                            </div>
                                        )}
                                    </li>
                                ))}
                        </ul>
                    ) : (
                        <div className="mt-2 text-sm text-gray-500 italic">
                            No events recorded for this claim yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


// frontend/src/components/ClaimDetail.jsx

