import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import queryRoutes from './routes/queryRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import rephraseRoutes from './routes/rephraseRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const connectDB = async () => {
    const uri = process.env.MONGO_URI; // e.g. mongodb+srv://user:pass@cluster.yourid.mongodb.net/driver_sentiment?retryWrites=true&w=majority

  if (!uri) {
    throw new Error('MONGO_URL is missing in environment');
  }

  const opts = {
    serverSelectionTimeoutMS: 15000, // 15s to find a primary
    socketTimeoutMS: 30000,
    connectTimeoutMS: 15000,
    maxPoolSize: 10,
    // Mongoose 7+ uses TLS automatically with SRV URIs
  };

  try {
    const conn = await mongoose.connect(uri, opts);
    console.log('[mongo] connected to', conn.connection.host);
    console.log("MONGODB is fully working")
    return conn.connection;
  } catch (err) {
    console.error('[mongo] connection error:\n', err);
    throw err;
  }
}

app.use('/api/query', queryRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/rephrase', rephraseRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req,res)=> res.json({ ok: true, msg:'Claims API running' }));

const port = process.env.PORT || 4000;
connectDB();
app.listen(port, ()=> console.log(`API listening on ${port}`));
