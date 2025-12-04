// backend/src/models/QueryLog.js
import mongoose from 'mongoose';
const QueryLogSchema = new mongoose.Schema({
  text: String,
  matched_claim_ids: [mongoose.Schema.Types.ObjectId],
  intent: String,
  response_text: String,
  user_id: { type: String, default: 'demo-user' },
  latency_ms: Number,
  meta: mongoose.Schema.Types.Mixed
}, { timestamps: { createdAt: 'created_at' } });

export default mongoose.model('QueryLog', QueryLogSchema);
