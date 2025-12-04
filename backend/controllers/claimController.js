import express from 'express';
import Claim from '../models/Claim.js';
import ClaimEvent from '../models/ClaimEvent.js';

export async function getClaimDetailsById(req, res) {
  try {
    const claim = await Claim.findById(req.params.id).lean();
    if (!claim) return res.status(404).json({ error: 'not_found' });
    const events = await ClaimEvent.find({ claim_id: claim._id }).sort({ created_at: -1 }).limit(100).lean();
    res.json({ claim, events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
};

export async function getClaimDetails(req, res) {
  try {
    const { policy, status, limit = 50 } = req.query;
    const q = {};
    if (policy) q.policy_number = policy;
    if (status) q.status = status;
    const items = await Claim.find(q).sort({ submitted_at: -1 }).limit(Number(limit)).lean();
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
};
