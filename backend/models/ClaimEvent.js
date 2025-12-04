import mongoose from 'mongoose';
const ClaimEventSchema = new mongoose.Schema({
  claim_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true, index: true },
  event_type: String,
  event_data: mongoose.Schema.Types.Mixed,
  created_by: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.model('ClaimEvent', ClaimEventSchema);
