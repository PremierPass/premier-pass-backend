import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Student login
app.post('/student-login', async (req, res) => {
  const { code } = req.body;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('code', code)
    .eq('role', 'student')
    .single();

  if (error || !data) return res.status(401).json({ error: 'Invalid code' });
  res.json(data);
});

// Teacher/Admin login
app.post('/login', async (req, res) => {
  const { email } = req.body;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .in('role', ['teacher', 'admin'])
    .single();

  if (error || !data) return res.status(401).json({ error: 'Unauthorized' });
  res.json(data);
});

// Create pass
app.post('/passes', async (req, res) => {
  const { user_id, location } = req.body;
  const { data, error } = await supabase
    .from('passes')
    .insert([{ user_id, location, status: 'queued', start_time: new Date() }])
    .select();

  if (error) return res.status(400).json({ error });
  res.json(data);
});

// Get passes (queue view)
app.get('/passes/:location', async (req, res) => {
  const { location } = req.params;
  const { data, error } = await supabase
    .from('passes')
    .select('*')
    .eq('location', location)
    .order('start_time', { ascending: true });

  if (error) return res.status(400).json({ error });
  res.json(data);
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Premier Pass backend running on port ${port}`));
