import QueryLog from '../models/QueryLog.js';

export async function queryRoll(req, res) {
  const start = Date.now();
  const { text } = req.body;
  let log = { text };
  try {
    const claimNum = extractClaimNumber(text);
    if (claimNum) {
      const claim = await Claim.findOne({ claim_number: claimNum }).lean();
      log.intent = 'claim_lookup';
      log.matched_claim_ids = claim ? [claim._id] : [];
      if (claim) {
        const responseText = `Claim ${claim.claim_number} is ${claim.status}.`;
        log.response_text = responseText;
        log.latency_ms = Date.now() - start;
        await QueryLog.create(log);
        return res.json({ type: 'claim_status', text: responseText, claim });
      } else {
        log.response_text = `No claim found with number ${claimNum}.`;
        log.latency_ms = Date.now() - start;
        await QueryLog.create(log);
        return res.json({ text: log.response_text });
      }
    }

    // improved search scoring (see next section)
    const candidates = await Claim.find(
      { $text: { $search: text } },
      { score: { $meta: "textScore" } }
    ).sort({ /* we'll apply compound scoring later */ score: { $meta: "textScore" } }).limit(10).lean();

    log.intent = 'text_search';
    log.matched_claim_ids = candidates.map(c => c._id);
    log.response_text = `Found ${candidates.length} matches.`;
    log.latency_ms = Date.now() - start;
    await QueryLog.create(log);

    return res.json({ text: log.response_text, items: candidates });

  } catch (err) {
    log.latency_ms = Date.now() - start;
    log.meta = { error: err.message };
    await QueryLog.create(log);
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
};
