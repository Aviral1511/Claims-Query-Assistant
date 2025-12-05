/**
 * etl_load_csv.js
 * Usage: node src/etl_load_csv.js
 * It reads backend/data/mock_claims.csv and inserts documents (upserts claim_number).
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Claim from '../models/Claim.js'; // uses your existing model path
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
dotenv.config();

const MONGO = process.env.MONGO_URI;;
const CSV_PATH = path.resolve('data', 'mock_claims.csv');

async function main(){
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found at', CSV_PATH);
    process.exit(1);
  }
  const txt = fs.readFileSync(CSV_PATH, 'utf8');
  const records = parse(txt, { columns: true, skip_empty_lines: true });

  console.log('Connecting to mongo', MONGO);
  await mongoose.connect(MONGO);
  console.log('Connected. Records to ingest:', records.length);

  // Optionally: clear existing claims (uncomment if desired)
  // await Claim.deleteMany({});

  const bulkOps = [];
  for (const rec of records) {
    // parse fields and coerce types
    const doc = {
      claim_number: rec.claim_number,
      patient_name: rec.patient_name.replace(/^"|"$/g,''),
      patient_age: rec.patient_age ? Number(rec.patient_age) : undefined,
      patient_gender: rec.patient_gender,
      policy_number: rec.policy_number,
      doctor_name: (rec.doctor_name || '').replace(/^"|"$/g,''),
      doctor_specialty: (rec.doctor_specialty || '').replace(/^"|"$/g,''),
      diagnosis: (rec.diagnosis || '').replace(/^"|"$/g,''),
      diagnosis_code: rec.diagnosis_code,
      status: rec.claim_status,
      denial_code: rec.denial_code,
      denial_reason: (rec.denial_reason || '').replace(/^"|"$/g,''),
      amount: rec.amount ? Number(rec.amount) : 0,
      submitted_at: rec.submitted_at ? new Date(rec.submitted_at) : undefined,
      processed_at: rec.processed_at ? new Date(rec.processed_at) : undefined,
      notes: (rec.notes || '').replace(/^"|"$/g,''),
      provider: (rec.provider || '').replace(/^"|"$/g,''),
      metadata: { provider: (rec.provider || '').replace(/^"|"$/g,'') }
    };

    // upsert by claim_number to avoid duplicates
    bulkOps.push({
      updateOne: {
        filter: { claim_number: doc.claim_number },
        update: { $set: doc },
        upsert: true
      }
    });

    // flush in batches
    if (bulkOps.length >= 1000) {
      await Claim.bulkWrite(bulkOps);
      console.log('Inserted batch, total inserted so far ~', '??');
      bulkOps.length = 0;
    }
  }
  if (bulkOps.length) {
    await Claim.bulkWrite(bulkOps);
  }

  // ensure useful indexes exist
  try {
    await Claim.collection.createIndex({ claim_number: 1 }, { unique: true });
    await Claim.collection.createIndex({ policy_number: 1 });
    await Claim.collection.createIndex({ status: 1 });
    await Claim.collection.createIndex({ submitted_at: -1 });
    await Claim.collection.createIndex({ amount: 1 });
    await Claim.collection.createIndex({ patient_name: 'text', notes: 'text', denial_reason: 'text' }, { name: 'claims_text_idx' });
    console.log('Indexes created/ensured.');
  } catch (e) {
    console.warn('Index creation warning', e.message);
  }

  console.log('ETL complete. Total claims in collection:', await Claim.countDocuments());
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
