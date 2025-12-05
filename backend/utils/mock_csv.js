// utils/generate_mock_claims_csv.js
// Run with: node utils/generate_mock_claims_csv.js
import fs from 'fs';
import path from 'path';

const CSV_PATH = path.resolve('data', 'mock_claims.csv');

// Ensure data/ directory exists
const dir = path.dirname(CSV_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Must match your ETL's expected columns
const headers = [
  'claim_number',
  'patient_name',
  'patient_age',
  'patient_gender',
  'policy_number',
  'doctor_name',
  'doctor_specialty',
  'diagnosis',
  'diagnosis_code',
  'claim_status',
  'denial_code',
  'denial_reason',
  'amount',
  'submitted_at',
  'processed_at',
  'notes',
  'provider'
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  // yyyy-mm-dd (your ETL does new Date(submitted_at))
  return new Date(t).toISOString().split('T')[0];
}

const genders = ['M', 'F', 'O'];
const statuses = ['APPROVED', 'DENIED', 'PENDING'];
const specialties = ['Cardiology', 'Orthopedics', 'Dermatology', 'Pediatrics'];
const providers = ['City Hospital', 'Sunrise Clinic', 'HealthPlus Center', 'Green Valley Hospital'];

const lines = [];
lines.push(headers.join(',')); // header row

const N = 2000; // how many mock rows you want

for (let i = 1; i <= N; i++) {
  const claimNumber = `CLM-${1000 + i}`;
  const policyNumber = `POL-${2000 + i}`;

  const submittedAt = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31));
  const processedAt = randomDate(new Date(2024, 0, 1), new Date(2025, 0, 31));

  const status = randomFrom(statuses);
  let denialCode = '';
  let denialReason = '';

  if (status === 'DENIED') {
    denialCode = 'D01';
    denialReason = 'Insufficient coverage';
  }

  const row = [
    claimNumber,
    `"Patient ${i}"`,
    20 + (i % 50),
    randomFrom(genders),
    policyNumber,
    `"Dr. Doctor ${i}"`,
    `"${randomFrom(specialties)}"`,
    `"Diagnosis for patient ${i}"`,
    `DX${100 + (i % 50)}`,
    status,
    denialCode,
    `"${denialReason}"`,
    (1000 + i * 5).toFixed(2),
    submittedAt,
    processedAt,
    `"Auto-generated mock claim"`,
    `"${randomFrom(providers)}"`
  ];

  lines.push(row.join(','));
}

fs.writeFileSync(CSV_PATH, lines.join('\n'), 'utf8');
console.log(`Mock CSV generated at: ${CSV_PATH} with ${N} rows.`);
