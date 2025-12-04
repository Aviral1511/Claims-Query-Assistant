import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import cors from 'cors';
import queryRoutes from './routes/query.js';
import claimRoutes from './routes/claims.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/claimsdb';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('Connected to Mongo'))
  .catch(err => { console.error('Mongo connection error', err); process.exit(1); });

app.use('/api/query', queryRoutes);
app.use('/api/claims', claimRoutes);

app.get('/', (req,res)=> res.json({ ok: true, msg:'Claims API running' }));

const port = process.env.PORT || 4000;
app.listen(port, ()=> console.log(`API listening on ${port}`));
