// backend/src/routes/query.js
import express from 'express';
import Claim from '../models/Claim.js';
import mustache from 'mustache';
import { templates } from '../templates.js';
const router = express.Router();

function extractClaimNumber(text){
  if(!text) return null;
  const m = text.match(/\bCLM[-]?\d{4}[-]?\d+\b/i);
  return m ? m[0].toUpperCase() : null;
}

function containsDeniedKeyword(text = '') {
  if (!text) return false;
  const s = text.toLowerCase();
  return s.includes('denied') || s.includes('denial') || s.includes('why was my claim denied') || s.includes('why denied');
}

export async function postQueries(req, res) {
  const start = Date.now();
  const { text } = req.body;
  try {
    const claimNum = extractClaimNumber(text);
    if (claimNum) {
      const claim = await Claim.findOne({ claim_number: claimNum }).lean();
      if (claim) {
        const tplKey = claim.status === 'denied' ? 'claim_denial' : 'claim_status';
        const rendered = mustache.render(templates[tplKey], {
          claim_number: claim.claim_number,
          patient_name: claim.patient_name,
          policy_number: claim.policy_number,
          status: claim.status,
          amount: claim.amount,
          denial_code: claim.denial_code || '',
          denial_reason: claim.denial_reason || '',
          notes: claim.notes || '',
          metadata: claim.metadata || {},
          submitted_at: claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString() : ''
        });
        const latency = Date.now() - start;
        return res.json({ type: 'claim_status', text: rendered, claim, latency_ms: latency, confidence: 1.0 });
      } else {
        const rendered = mustache.render(templates.no_matches, {});
        return res.json({ text: rendered, latency_ms: Date.now() - start, confidence: 0.0 });
      }
    }

    // ---- Aggregation scoring fallback ----
    if (!text || text.trim().length < 2) {
      return res.json({ text: "Please enter a claim number or a few keywords.", latency_ms: Date.now() - start });
    }

    // config weights — tweak for demo
    const WEIGHTS = {
      text: 1.0,            // weight for Mongo textScore
      exactClaim: 8.0,      // large boost for exact claim number match
      exactPolicy: 4.0,     // boost for exact policy number match
      recencyDaysWindow: 30, // recency window in days
      recencyBoost: 1.0,    // boost if within window
      deniedBoost: 1.5      // boost if user asks about denial and claim is denied
    };

    // Precompute whether user query appears to be about denials
    const wantDenied = containsDeniedKeyword(text);

    // ---- corrected aggregation scoring fallback ----
const agg = [
  // 1) initial text match (requires text index)
  { $match: { $text: { $search: text } } },

  // 2) project textScore and useful fields (isDenied now numeric)
  { $addFields: {
      textScore: { $meta: "textScore" },
      exactClaimMatch: { $cond: [{ $eq: [ { $toUpper: "$claim_number" }, text.toUpperCase() ] }, 1, 0] },
      exactPolicyMatch: { $cond: [{ $eq: [ { $toUpper: "$policy_number" }, text.toUpperCase() ] }, 1, 0] },
      daysSinceSubmitted: {
        $divide: [
          { $subtract: [ new Date(), "$submitted_at" ] },
          1000 * 60 * 60 * 24
        ]
      },
      // compute numeric isDenied (1 or 0) instead of boolean
      isDenied: { $cond: [{ $eq: ["$status", "denied"] }, 1, 0] }
    }
  },

  // 3) compute recencyBoost (1 if within window, 0 else)
  { $addFields: {
      recencyBoost: {
        $cond: [{ $lte: ["$daysSinceSubmitted", WEIGHTS.recencyDaysWindow] }, 1, 0]
      }
    }
  },

  // 4) compute raw totalScore using weights (all numeric)
  { $addFields: {
      totalScore: {
        $add: [
          { $multiply: ["$textScore", WEIGHTS.text] },
          { $multiply: ["$exactClaimMatch", WEIGHTS.exactClaim] },
          { $multiply: ["$exactPolicyMatch", WEIGHTS.exactPolicy] },
          { $multiply: ["$recencyBoost", WEIGHTS.recencyBoost] },
          // multiply numeric isDenied by deniedBoost only when wantDenied true
          { $multiply: ["$isDenied", (wantDenied ? WEIGHTS.deniedBoost : 0)] }
        ]
      }
    }
  },

  // 5) final sort & limit
  { $sort: { totalScore: -1, textScore: -1, submitted_at: -1 } },
  { $limit: 10 },

  // 6) project final fields
  { $project: {
      claim_number: 1, patient_name: 1, policy_number: 1, status:1, amount:1, submitted_at:1,
      denial_code:1, denial_reason:1, notes:1, metadata:1,
      textScore:1, exactClaimMatch:1, exactPolicyMatch:1, recencyBoost:1, isDenied:1, totalScore:1
    }
  }
];


    const candidates = await Claim.aggregate(agg);

    // Normalize confidence: scale totalScore into 0..1 relative to max in candidates
    let maxScore = 0;
    candidates.forEach(c => { if (c.totalScore && c.totalScore > maxScore) maxScore = c.totalScore; });
    const items = candidates.map(c => {
      const confidence = maxScore > 0 ? Math.min(1, c.totalScore / maxScore) : 0;
      return { ...c, confidence };
    });

    if (!items.length) {
      const rendered = mustache.render(templates.no_matches, {});
      return res.json({ text: rendered, latency_ms: Date.now() - start, items: [], confidence: 0.0 });
    }

    const renderedSummary = mustache.render(templates.multiple_matches, {
      count: items.length,
      top: Math.min(5, items.length)
    });

    return res.json({
      text: renderedSummary,
      items,
      latency_ms: Date.now() - start,
      confidence: items[0].confidence
    });

  } catch (err) {
    console.error('query error', err);
    res.status(500).json({ error: 'server_error', latency_ms: Date.now() - start });
  }
};

export default router;
