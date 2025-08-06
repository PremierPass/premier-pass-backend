import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import cron from 'node-cron';

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_EMAIL_PASS
  }
});

// Generate 3-digit alphanumeric code
const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// Sign-in endpoint
app.post('/signin', async (req, res) => {
  const { studentId } = req.body;

  const code = generateCode();
  const { data, error } = await supabase.from('attendance_logs').insert([
    {
      student_id: studentId,
      code,
      action: 'sign_in',
      timestamp: new Date()
    }
  ]);

  if (error) return res.status(500).json({ error: error.message });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Logs!A:E',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[new Date().toLocaleString(), studentId, 'Sign In', code, '']]
    }
  });

  res.json({ message: 'Signed in', code });
});

// Sign-out endpoint
app.post('/signout', async (req, res) => {
  const { studentId } = req.body;

  const { data, error } = await supabase.from('attendance_logs').insert([
    {
      student_id: studentId,
      action: 'sign_out',
      timestamp: new Date()
    }
  ]);

  if (error) return res.status(500).json({ error: error.message });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Logs!A:E',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[new Date().toLocaleString(), studentId, 'Sign Out', '', '']]
    }
  });

  res.json({ message: 'Signed out' });
});

// Teacher override
app.post('/override', async (req, res) => {
  const { studentId, action, adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });

  const { error } = await supabase.from('attendance_logs').insert([
    {
      student_id: studentId,
      action,
      timestamp: new Date(),
      override: true
    }
  ]);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: `Override successful: ${action}` });
});

// Auto sign-out at noon and 2 PM
cron.schedule('0 12 * * *', async () => {
  const { data: students } = await supabase.from('students').select('*').eq('leave_time', '12:00');
  for (
