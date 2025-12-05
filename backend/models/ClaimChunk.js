// backend/src/models/ClaimChunk.js
import mongoose from 'mongoose';

const ClaimChunkSchema = new mongoose.Schema({
  claim_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', index: true },
  claim_number: { type: String, index: true },
  text: { type: String, required: true },        // chunk text used for embeddings
  embedding: { type: [Number], required: true }, // numeric vector
  status: String,
  diagnosis: String,
  diagnosis_code: String,
  submitted_at: Date,
  provider: String
}, { timestamps: true });

ClaimChunkSchema.index({ claim_number: 1 });

export default mongoose.model('ClaimChunk', ClaimChunkSchema);
