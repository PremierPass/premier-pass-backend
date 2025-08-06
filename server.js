import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase connection
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Premier Pass backend is running!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Sign-in endpoint
app.post('/signin', async (req, res) => {
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId is required' });
  }

  const code = Math.random().toString(36).substring(2, 5).toUpperCase();

  const { error } = await supabase.from('attendance_logs').insert([
    { student_id: studentId, action: 'sign_in', code }
  ]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Sign-in logged', code });
});

// Sign-out endpoint
app.post('/signout', async (req, res) => {
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId is required' });
  }

  const { error } = await supabase.from('attendance_logs').insert([
    { student_id: studentId, action: 'sign_out' }
  ]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Sign-out logged' });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
