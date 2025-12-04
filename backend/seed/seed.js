// C:\codes\Abacus-Insights\backend\seed\seed.js
import mongoose from 'mongoose';
import faker  from 'faker'; // ok if you have faker@5.*? see notes below
import Claim from '../models/Claim.js';
import ClaimEvent from '../models/ClaimEvent.js';
import 'dotenv/config'

const uri = process.env.MONGO_URI;
// console.log('Using MONGO_URI:', uri);

// --- Compatibility helpers (work across faker versions) ---
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getFirstName = () => {
  if (faker.person && typeof faker.person.firstName === 'function') return faker.person.firstName();
  if (faker.name && typeof faker.name.firstName === 'function') return faker.name.firstName();
  // fallback simple generation
  return `Fn${Math.floor(Math.random() * 1000)}`;
};
const getLastName = () => {
  if (faker.person && typeof faker.person.lastName === 'function') return faker.person.lastName();
  if (faker.name && typeof faker.name.lastName === 'function') return faker.name.lastName();
  return `Ln${Math.floor(Math.random() * 1000)}`;
};
const getCompanyName = () => {
  if (faker.company && typeof faker.company.name === 'function') return faker.company.name();
  if (faker.company && typeof faker.company.companyName === 'function') return faker.company.companyName();
  if (faker.companyName && typeof faker.companyName === 'function') return faker.companyName();
  return `Company ${Math.floor(Math.random() * 1000)}`;
};

const getInt = (min, max) => {
  // try multiple faker APIs, else fallback to Math.random
  try {
    if (faker.number && typeof faker.number.int === 'function') return faker.number.int({ min, max });
    if (faker.datatype && typeof faker.datatype.number === 'function') return faker.datatype.number({ min, max });
    if (faker.random && typeof faker.random.number === 'function') return faker.random.number({ min, max });
  } catch (e) { /* ignore */ }
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getFloat = (min, max, precision = 0.01) => {
  try {
    if (faker.number && typeof faker.number.float === 'function') {
      // new API: faker.number.float({ min, max, precision })
      return Number(faker.number.float({ min, max, precision }).toFixed(2));
    }
    if (faker.finance && typeof faker.finance.amount === 'function') {
      return Number(faker.finance.amount(min, max, 2));
    }
    if (faker.datatype && typeof faker.datatype.float === 'function') {
      return Number(faker.datatype.float({ min, max, precision }).toFixed(2));
    }
  } catch (e) { /* ignore */ }
  // fallback
  return Number((Math.random() * (max - min) + min).toFixed(2));
};

const getSentence = () => {
  try {
    if (faker.lorem && typeof faker.lorem.sentence === 'function') return faker.lorem.sentence();
    if (faker.random && typeof faker.random.words === 'function') return faker.random.words(6);
  } catch (e) {}
  return 'Seed note.';
};

const randomPastDateDays = (daysMax) => {
  const ms = Math.floor(Math.random() * daysMax * 24 * 60 * 60 * 1000);
  return new Date(Date.now() - ms);
};

// --- DB connect ---
async function connectDB() {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    console.log('✔ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message || err);
    throw err;
  }
}

async function seed() {
  try {
    await connectDB();
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Mongoose not connected (readyState=' + mongoose.connection.readyState + ')');
    }

    await Claim.deleteMany({});
    await ClaimEvent.deleteMany({});

    const statuses = ['submitted', 'in_review', 'approved', 'denied', 'paid'];
    const denialReasons = [
      'Missing pre-authorization',
      'Non-covered service',
      'Duplicate claim',
      'Invalid member ID'
    ];

    const claims = [];
    for (let i = 0; i < 200; i++) {
      const year = 2025;
      const num = 1000 + i;
      const claim_number = `CLM-${year}-${num}`;
      const status = pick(statuses);
      const denial_code = status === 'denied' ? `D${getInt(100, 999)}` : null;
      const denial_reason = denial_code ? pick(denialReasons) : null;

      const claim = {
        claim_number,
        patient_name: `${getFirstName()} ${getLastName()}`,
        policy_number: `POL-${getInt(1000, 9999)}`,
        status,
        amount: getFloat(500, 50000),
        submitted_at: randomPastDateDays(180), // ~past 6 months
        processed_at: randomPastDateDays(30),
        denial_code,
        denial_reason,
        notes: getSentence(),
        metadata: { provider: getCompanyName() }
      };
      claims.push(claim);
    }

    const created = await Claim.insertMany(claims);
    // console.log(claims);

    const events = [];
    for (let i = 0; i < Math.min(20, created.length); i++) {
      events.push({
        claim_id: created[i]._id,
        event_type: 'status_change',
        event_data: { from: 'submitted', to: created[i].status },
        created_by: 'seed-script',
        created_at: new Date()
      });
    }
    await ClaimEvent.insertMany(events);
    // console.log(events);
    console.log('Seed complete');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(0);
  }
}

seed();
