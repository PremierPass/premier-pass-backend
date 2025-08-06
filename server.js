import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Health check
app.get('/', (req, res) => {
  res.send('Premier Pass backend is running!');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Sign-in endpoint
app.post('/signin', async (req, res) => {
  const { studentId } = req.body;

  // Create a 3-digit alphanumeric code
  const code = Math.random().toString(36).substring(2, 5).toUpperCase();

  // Log sign-in
  const { error } = await supabase.from('attendance_logs').insert([
    { student_id: studentId, action: 'sign_in', code }
  ]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Sign-in logged', code });
});

// Sign-out endpoint
app.post('/signout', async (req, res) => {
  const { studentId } = req.body;

  const { error } = await supabase.from('attendance_logs').insert([
    { student_id: studentId, action: 'sign_out' }
  ]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Sign-out logged' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
