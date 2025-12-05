// backend/src/routes/query_rag.js
import express from 'express';
import fetch from 'node-fetch';
import ClaimChunk from '../models/ClaimChunk.js';
import Claim from '../models/Claim.js';

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDNDkdKb_c_7eRinUh3uRuvRrov1ueJlas';
const GEMINI_MODEL = 'gemini-embedding-001';

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set. Please export it and retry.');
  process.exit(1);
}

async function embedBatch(texts) {
  // Endpoint: v1beta/models/{model}:batchEmbedContents
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`;

  const body = {
    requests: texts.map(t => ({
      // Request model name should be "models/{model_id}"
      model: `models/${GEMINI_MODEL}`,
      content: {
        parts: [{ text: t }],
      },
      // Good for RAG document embeddings
      taskType: 'RETRIEVAL_DOCUMENT',
    })),
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Gemini embedding API error: ${resp.status} - ${txt}`);
  }

  const data = await resp.json();
  // batchEmbedContents returns: { embeddings: [ { values: [...] }, ... ] }
  return data.embeddings.map(e => e.values);
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embedQuery(text) {
  const [embedding] = await embedBatch([text]); // reuse your batch function
  return embedding;
}

router.post('/', async (req, res) => {
  const start = Date.now();
  const { text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text_required' });
  }

  try {
    const queryEmb = await embedQuery(text);
    // For demo, load all chunks. Fine for few thousand.
    const chunks = await ClaimChunk.find().lean();

    if (!chunks.length) {
      return res.json({ text: 'No RAG index available. Please run index_claims_rag.js first.', items: [] });
    }

    // compute similarity
    const scored = chunks.map(c => ({
      ...c,
      similarity: cosineSimilarity(queryEmb, c.embedding)
    }));

    scored.sort((a, b) => b.similarity - a.similarity);

    const TOP_K = 15;
    const top = scored.slice(0, TOP_K).filter(item => item.similarity > 0); // keep positive matches

    // Optionally: fetch full claims for top results
    const claimIds = [...new Set(top.map(t => t.claim_id.toString()))];
    const claims = await Claim.find({ _id: { $in: claimIds } }).lean();
    const claimMap = new Map(claims.map(c => [c._id.toString(), c]));

    const items = top.map(t => {
      const c = claimMap.get(t.claim_id.toString());
      return {
        claim_id: t.claim_id,
        claim_number: t.claim_number,
        status: c?.status || t.status,
        diagnosis: c?.diagnosis || t.diagnosis,
        diagnosis_code: c?.diagnosis_code || t.diagnosis_code,
        denial_reason: c?.denial_reason,
        amount: c?.amount,
        submitted_at: c?.submitted_at,
        provider: c?.provider || t.provider,
        similarity: t.similarity,
        text: t.text
      };
    });

    const maxSim = items.length ? items[0].similarity : 0;
    const confidence = maxSim; // simple: top similarity as confidence

    const latency = Date.now() - start;
    const summary = items.length
      ? `Found ${items.length} semantically matched claims (top similarity ${(maxSim || 0).toFixed(2)}).`
      : 'No semantically relevant claims found.';

    res.json({
      text: summary,
      items,
      latency_ms: latency,
      confidence
    });
  } catch (err) {
    console.error('RAG query error:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

export default router;
