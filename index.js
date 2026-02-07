require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const planRoutes = require('./routes/plans');
const partnerRoutes = require('./routes/partners');
const doctorRoutes = require('./routes/doctors');
const paymentRoutes = require('./routes/payments');
const contactRoutes = require('./routes/contact');
const activityRoutes = require('./routes/activity');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- CORS SETUP ----------
const defaultAllowed = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'https://medicostsaver.com',
  'https://www.medicostsaver.com',
  'https://medicostsaver-frontend.vercel.app',
  'https://medi-frontend-delta.vercel.app'
];

const envAllowed = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [];

let allowedOrigins = [...new Set([...defaultAllowed, ...envAllowed])];

// In development, ensure localhost entries are present
if (process.env.NODE_ENV !== 'production') {
  const devDefaults = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  allowedOrigins = Array.from(new Set([...allowedOrigins, ...devDefaults]));
}

console.log('CORS allowed origins:', allowedOrigins);

// Main CORS middleware
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);  // allow Safari/no-origin cases
      if (allowedOrigins.includes(origin)) return callback(null, true);

      if (process.env.NODE_ENV !== 'production') {
        console.log("Blocked Origin:", origin);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",     // <-- missing
    allowedHeaders: ["Content-Type", "Authorization"],      // <-- missing
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// ---------- OTHER MIDDLEWARE ----------
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));

// Static uploads with CORS
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath, stat) => {
      const reqOrigin = res.req.headers.origin;
      const defaultOrigin = reqOrigin && allowedOrigins.includes(reqOrigin)
        ? reqOrigin
        : allowedOrigins[0] || '*';

      res.setHeader('Access-Control-Allow-Origin', defaultOrigin);
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    },
  })
);

// ---------- ROUTES ----------
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/activity', activityRoutes);

app.get('/', (req, res) =>
  res.send({
    ok: true,
    message: 'Medico Backend Running',
    timestamp: new Date().toISOString(),
  })
);

app.get('/api/test', (req, res) =>
  res.json({
    ok: true,
    message: 'API is working',
    timestamp: new Date().toISOString(),
  })
);

// ---------- DB & SERVER ----------
if (process.env.MONGODB_URI) {
  connectDB(process.env.MONGODB_URI);
} else {
  console.warn('MONGODB_URI not set. Server will run but DB operations will fail until a valid URI is provided.');
}

app.set('trust proxy', 1);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
