import faker from 'faker';
import Claim from './models/Claim.js';
import ClaimEvent from './models/ClaimEvent.js';


async function seed(){
  await Claim.deleteMany({});
  await ClaimEvent.deleteMany({});
  const statuses = ['submitted','in_review','approved','denied','paid'];
  const denialReasons = [ 'Missing pre-authorization', 'Non-covered service', 'Duplicate claim', 'Invalid member ID' ];
  const claims = [];
  for(let i=0;i<200;i++){
    const year = 2025;
    const num = 1000 + i;
    const claim_number = `CLM-${year}-${num}`;
    const status = faker.helpers.randomize(statuses);
    const denial_code = status === 'denied' ? `D${faker.datatype.number({min:100, max:999})}` : null;
    const denial_reason = denial_code ? faker.helpers.randomize(denialReasons) : null;
    const claim = {
      claim_number,
      patient_name: faker.name.findName(),
      policy_number: `POL-${faker.datatype.number({min:1000, max:9999})}`,
      status,
      amount: Number(faker.finance.amount(500, 50000, 2)),
      submitted_at: faker.date.past(0.5),
      processed_at: faker.date.recent(30),
      denial_code,
      denial_reason,
      notes: faker.lorem.sentence(),
      metadata: { provider: faker.company.companyName() }
    };
    claims.push(claim);
  }
  const created = await Claim.insertMany(claims);
  // create a few events for first 20 claims
  const events = [];
  for(let i=0;i<20;i++){
    events.push({
      claim_id: created[i]._id,
      event_type: 'status_change',
      event_data: { from: 'submitted', to: created[i].status },
      created_by: 'seed-script'
    });
  }
  await ClaimEvent.insertMany(events);
  console.log('Seed complete');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
