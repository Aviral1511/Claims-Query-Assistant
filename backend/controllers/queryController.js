import express from 'express';
import Claim from '../models/Claim.js';

function extractClaimNumber(text){
  if(!text) return null;
  const m = text.match(/\bCLM[-]?\d{4}[-]?\d+\b/i);
  return m ? m[0].toUpperCase() : null;
}

export async function postQueries(req, res) {
  const { text } = req.body;
  try {
    const claimNum = extractClaimNumber(text);
    if (claimNum) {
      const claim = await Claim.findOne({ claim_number: claimNum }).lean();
      if (claim) {
        return res.json({ type: 'claim_status', text: `Claim ${claim.claim_number} is ${claim.status}.`, claim });
      } else {
        return res.json({ text: `No claim found with number ${claimNum}.` });
      }
    }
    // fallback: text search
    if (!text || text.trim().length < 2) return res.json({ text: 'Please enter a claim number or some keywords.'});
    const candidates = await Claim.find(
      { $text: { $search: text } },
      { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } }).limit(10).lean();
    if (!candidates.length) {
      return res.json({ text: 'No matching claims found. Try claim number or policy number.' });
    }
    return res.json({ text: `Found ${candidates.length} matches.`, items: candidates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
};
