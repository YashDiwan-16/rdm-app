import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import router from './routes/index';

dotenv.config();

const app = express();

// CORS configuration - allow all origins in development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
}));

app.use(express.json());
app.use('/api', router);

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} and accessible from network`));
