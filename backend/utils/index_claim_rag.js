/**
 * index_claims_rag.js
 */

import mongoose from 'mongoose';
import Claim from '../models/Claim.js';
import ClaimChunk from '../models/ClaimChunk.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const MONGO = process.env.MONGO_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-embedding-001';
const LIMIT = 100; // max claims to index

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


function buildChunkText(claim) {
  // Human-readable representation of a claim for semantic matching
  const statusPhrase = claim.status ? `Status: ${claim.status}.` : '';
  const diagPhrase = claim.diagnosis ? `Diagnosis: ${claim.diagnosis} (${claim.diagnosis_code || 'N/A'}).` : '';
  const denialPhrase = claim.status === 'denied' && claim.denial_reason
    ? `Denial reason: ${claim.denial_reason}.`
    : '';
  const providerPhrase = claim.provider ? `Provider: ${claim.provider}.` : '';
  const amountPhrase = claim.amount ? `Amount: ${claim.amount}.` : '';
  const submittedPhrase = claim.submitted_at
    ? `Submitted on ${new Date(claim.submitted_at).toDateString()}.`
    : '';

  const notes = claim.notes || '';

  return [
    `Claim ${claim.claim_number}.`,
    `Policy ${claim.policy_number || 'N/A'}.`,
    statusPhrase,
    diagPhrase,
    denialPhrase,
    providerPhrase,
    amountPhrase,
    submittedPhrase,
    `Notes: ${notes}`
  ].filter(Boolean).join(' ');
}

async function main() {
  console.log('Connecting to', MONGO);
  await mongoose.connect(MONGO);
  console.log('Connected.');

  const totalClaims = await Claim.countDocuments();
  console.log('Total claims in DB:', totalClaims);

  const claims = await Claim.find().sort({ submitted_at: -1 }).limit(LIMIT).lean();
  console.log('Indexing claims:', claims.length);

  // Optional: clear existing chunks
  // await ClaimChunk.deleteMany({});
  // console.log('Cleared existing claim_chunks.');

  const BATCH_SIZE = 100;
  let processed = 0;

  for (let i = 0; i < claims.length; i += BATCH_SIZE) {
    const batch = claims.slice(i, i + BATCH_SIZE);

    const texts = batch.map(c => buildChunkText(c));
    console.log(`Embedding batch ${i/BATCH_SIZE + 1} with ${texts.length} items...`);

    const embeddings = await embedBatch(texts);

    const docs = batch.map((c, idx) => ({
      claim_id: c._id,
      claim_number: c.claim_number,
      text: texts[idx],
      embedding: embeddings[idx],
      status: c.status,
      diagnosis: c.diagnosis,
      diagnosis_code: c.diagnosis_code,
      submitted_at: c.submitted_at,
      provider: c.provider
    }));

    await ClaimChunk.insertMany(docs);
    processed += docs.length;
    console.log(`Indexed so far: ${processed}`);
  }

  console.log('RAG indexing complete. Total chunks:', await ClaimChunk.countDocuments());
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Indexing error:', err);
  process.exit(1);
});
