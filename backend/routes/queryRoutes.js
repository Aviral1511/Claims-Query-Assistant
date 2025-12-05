import express from 'express';
import Claim from '../models/Claim.js';
import mustache from 'mustache';
import { templates } from '../templates.js';

const router = express.Router();

// helpers above here (paste them)
function extractClaimNumber(text){
  if(!text) return null;
  const m = text.match(/\bCLM[-]?\d{3,}\b/i); // e.g. CLM-1003
  return m ? m[0].toUpperCase() : null;
}

function detectQueryFilters(text) {
  const t = (text || '').toLowerCase();
  const filter = {};
  const hints = {};

  if (t.includes('denied') || t.includes('rejected')) {
    filter.status = 'DENIED';
    hints.status = 'DENIED';
  } else if (t.includes('approved')) {
    filter.status = 'APPROVED';
    hints.status = 'APPROVED';
  } else if (t.includes('pending') || t.includes('in review') || t.includes('under review')) {
    filter.status = 'PENDING';
    hints.status = 'PENDING';
  }

  const now = new Date();

  if (t.includes('last year') || t.includes('past year')) {
    const yearAgo = new Date(now);
    yearAgo.setFullYear(now.getFullYear() - 1);
    filter.submitted_at = { $gte: yearAgo };
    hints.time = 'LAST_YEAR';
  }

  if (t.includes('last quarter') || t.includes('past quarter')) {
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    filter.submitted_at = { $gte: threeMonthsAgo };
    hints.time = 'LAST_QUARTER';
  }

  return { filter, hints };
}

function confidenceLevel(c) {
  if (c >= 0.75) return 'HIGH';
  if (c >= 0.5) return 'MEDIUM';
  return 'LOW';
}

router.post('/', async (req, res) => {
  const start = Date.now();
  const { text } = req.body || {};

  try {
    if (!text || !text.trim()) {
      return res.json({ text: 'Please enter a claim number or a few keywords.', latency_ms: Date.now() - start });
    }

    // 1) Exact claim number path
    const claimNum = extractClaimNumber(text);
    if (claimNum) {
      const claim = await Claim.findOne({ claim_number: claimNum }).lean();
      if (claim) {
        const tplKey = claim.status === 'DENIED' ? 'claim_denial' : 'claim_status';
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
        return res.json({
          type: 'claim_status',
          text: rendered,
          claim,
          latency_ms: latency,
          confidence: 1.0,
          confidence_level: 'HIGH',
          query_hints: { matched_claim_number: claimNum }
        });
      } else {
        const latency = Date.now() - start;
        return res.json({
          text: `No claim found with number ${claimNum}.`,
          latency_ms: latency,
          confidence: 0.0,
          confidence_level: 'LOW',
          query_hints: { matched_claim_number: claimNum }
        });
      }
    }

    // 2) Free-text path with intent-based filters
    const { filter, hints } = detectQueryFilters(text);

    // build Mongo match with text search + filters
    const match = { $text: { $search: text } };
    Object.assign(match, filter);

    // find with textScore
    const docs = await Claim.find(
      match,
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, submitted_at: -1 })
      .limit(20)
      .lean();

    const latency = Date.now() - start;

    if (!docs.length) {
      return res.json({
        text: 'No matching claims found. Try including a claim number or more specific keywords.',
        latency_ms: latency,
        items: [],
        confidence: 0.0,
        confidence_level: 'LOW',
        query_hints: hints
      });
    }

    // scoring → normalize textScore to confidence 0..1
    let maxScore = 0;
    docs.forEach(d => { if (typeof d.score === 'number' && d.score > maxScore) maxScore = d.score; });

    const items = docs.map(d => {
      const c = maxScore > 0 ? (d.score || 0) / maxScore : 0;
      return {
        ...d,
        confidence: c
      };
    });

    const topConf = items[0]?.confidence || 0;

    // summary
    let totalAmount = 0;
    const statusDistribution = {};
    for (const d of items) {
      const amt = Number(d.amount) || 0;
      totalAmount += amt;
      const st = d.status || 'UNKNOWN';
      statusDistribution[st] = (statusDistribution[st] || 0) + 1;
    }

    const summary = {
      totalClaims: items.length,
      totalAmount,
      statusDistribution
    };

    // nice summary text using template
    const renderedSummary = mustache.render(templates.multiple_matches || 'Found {{count}} claims. Showing top {{top}}.', {
      count: items.length,
      top: Math.min(items.length, 10)
    });

    return res.json({
      text: renderedSummary,
      items,
      latency_ms: latency,
      confidence: topConf,
      confidence_level: confidenceLevel(topConf),
      summary,
      query_hints: hints
    });

  } catch (err) {
    console.error('query error', err);
    return res.status(500).json({ error: 'server_error', latency_ms: Date.now() - start });
  }
});

export default router;
