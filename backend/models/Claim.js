import mongoose from 'mongoose';
const ClaimSchema = new mongoose.Schema({
  claim_number: { type: String, required: true, unique: true, index: true },
  patient_name: { type: String, index: true },
  policy_number: { type: String, index: true },
  status: { type: String, index: true },
  amount: { type: Number },
  submitted_at: { type: Date },
  processed_at: { type: Date },
  denial_code: String,
  denial_reason: String,
  notes: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

ClaimSchema.index({ patient_name: 'text', notes: 'text', denial_reason: 'text' }, { name: 'claims_text_idx' });

export default mongoose.model('Claim', ClaimSchema);
