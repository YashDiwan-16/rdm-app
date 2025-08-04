import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import router from './routes/index';

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:8081', 
    'http://localhost:19006',
    'http://192.168.0.2:8081',
    'http://192.168.0.2:19006',
    'exp://localhost:8081', 
    'exp://localhost:19006',
    'exp://192.168.0.2:8081',
    'exp://192.168.0.2:19006'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/api', router);

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} and accessible from network`));
