import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

// Supabase Setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ================= USER MANAGEMENT =================

// Create Teacher or Student (Admin/Teacher only)
app.post('/users', async (req, res) => {
  const { name, email, role, className } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let studentCode = null;
  if (role === 'student') {
    studentCode = Math.random().toString(36).substring(2, 5).toUpperCase();
  }

  const { data, error } = await supabase
    .from('users')
    .insert([{ name, email, role, class: className || null, student_code: studentCode }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'User created', user: data[0] });
});

// Get All Users (Admin only)
app.get('/users', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ================= DASH PASS MANAGEMENT =================

// Set DashPass for a student (Teacher only)
app.post('/dashpass', async (req, res) => {
  const { studentId, leaveTime } = req.body; // leaveTime should be "12:00" or "14:00"

  if (!studentId || !leaveTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { error } = await supabase
    .from('users')
    .update({ dash_pass: leaveTime })
    .eq('id', studentId);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: `DashPass set for student ${studentId} at ${leaveTime}` });
});

// ================= PASS MANAGEMENT =================

// Create a Pass (Student)
app.post('/passes', async (req, res) => {
  const { studentId, type } = req.body;

  if (!studentId || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get current active/queued passes for this type
  const { data: existing } = await supabase
    .from('passes')
    .select('*')
    .eq('type', type)
    .in('status', ['queue', 'active']);

  let maxLimit = type === 'testing_center' ? 8 : 1;
  let status = existing.length < maxLimit ? 'active' : 'queue';

  const { data, error } = await supabase
    .from('passes')
    .insert([{ student_id: studentId, type, status, start_time: status === 'active' ? new Date() : null }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Pass created', pass: data[0] });
});

// Get Active & Queue Passes
app.get('/passes', async (req, res) => {
  const { data, error } = await supabase.from('passes').select('*, users(name, student_code)').in('status', ['active', 'queue']);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ================= ATTENDANCE =================

// Sign In
app.post('/attendance/signin', async (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' });

  const { data, error } = await supabase
    .from('attendance_logs')
    .insert([{ student_id: studentId, action: 'sign_in', timestamp: new Date() }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Student signed in', log: data[0] });
});

// Sign Out
app.post('/attendance/signout', async (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' });

  const { data, error } = await supabase
    .from('attendance_logs')
    .insert([{ student_id: studentId, action: 'sign_out', timestamp: new Date() }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Student signed out', log: data[0] });
});

// ================= AUTO QUEUE & DASH PASS =================
setInterval(async () => {
  const now = new Date();

  // PASS MANAGEMENT
  const { data: activePasses } = await supabase
    .from('passes')
    .select('*')
    .eq('status', 'active');

  if (activePasses) {
    for (let pass of activePasses) {
      const limit = pass.type.includes('bathroom') ? 5 : 60; // minutes
      const elapsed = (now - new Date(pass.start_time)) / 60000;

      if (elapsed > limit) {
        // Expire the pass
        await supabase.from('passes').update({ status: 'expired' }).eq('id', pass.id);

        // Move next in queue
        const { data: queue } = await supabase
          .from('passes')
          .select('*')
          .eq('type', pass.type)
          .eq('status', 'queue')
          .order('created_at', { ascending: true })
          .limit(1);

        if (queue && queue.length > 0) {
          await supabase.from('passes').update({
            status: 'active',
            start_time: new Date()
          }).eq('id', queue[0].id);
        }
      }
    }
  }

  // DASH PASS AUTO SIGN-OUT
  const { data: students } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'student')
    .not('dash_pass', 'is', null);

  if (students) {
    for (let student of students) {
      const dashTime = new Date();
      const [hours, minutes] = student.dash_pass.split(':');
      dashTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (now >= dashTime) {
        const { data: lastLog } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('student_id', student.id)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (lastLog && lastLog.length > 0 && lastLog[0].action !== 'sign_out') {
          await supabase.from('attendance_logs').insert([
            { student_id: student.id, action: 'sign_out', timestamp: new Date() }
          ]);
        }
      }
    }
  }
}, 60000);

// ================= SERVER START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
