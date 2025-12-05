import { Router } from "express";
import { getClaimDetailsById, getClaimDetails } from "../controllers/claimController.js";
import Claim from "../models/Claim.js";
const router = Router();



router.get('/list', async (req, res) => {
  const start = Date.now();
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 50); // cap at 50

    // latest claims first; change to 1 for oldest first
    const docs = await Claim.find({})
      .sort({ submitted_at: -1 })
      .limit(limit)
      .lean();

    const latency = Date.now() - start;

    if (!docs.length) {
      return res.json({
        text: 'No claims found.',
        items: [],
        latency_ms: latency,
        confidence: 0,
        confidence_level: 'LOW',
        summary: {
          totalClaims: 0,
          totalAmount: 0,
          statusDistribution: {}
        },
        query_hints: { mode: 'SHOW_ALL' }
      });
    }

    // simple summary
    let totalAmount = 0;
    const statusDistribution = {};
    for (const d of docs) {
      const amt = Number(d.amount) || 0;
      totalAmount += amt;
      const st = d.status || 'UNKNOWN';
      statusDistribution[st] = (statusDistribution[st] || 0) + 1;
    }

    const summary = {
      totalClaims: docs.length,
      totalAmount,
      statusDistribution
    };

    // give each item a neutral confidence (we're not ranking here)
    const items = docs.map(d => ({
      ...d,
      confidence: 1 // or 0.8, your choice
    }));

    return res.json({
      text: `Showing ${docs.length} latest claims.`,
      items,
      latency_ms: latency,
      confidence: 1,
      confidence_level: 'HIGH',
      summary,
      query_hints: { mode: 'SHOW_ALL' }
    });
  } catch (err) {
    console.error('list claims error', err);
    return res.status(500).json({ error: 'server_error', latency_ms: Date.now() - start });
  }
});

router.get('/:id', getClaimDetailsById);
router.get('/', getClaimDetails);

export default router;