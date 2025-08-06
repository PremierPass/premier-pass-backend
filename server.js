import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ===== GOOGLE SHEETS SETUP =====
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// ===== BASE ENDPOINTS =====
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// ===== GOOGLE SHEETS TEST ENDPOINT =====
app.get('/test-sheets', async (req, res) => {
  try {
    const spreadsheetId = process.env.SHEET_ID; // Add this in Render ENV
    const range = 'Sheet1!A1';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    res.json({
      status: 'Google Sheets Connected',
      data: response.data.values || 'No data found',
    });
  } catch (err) {
    console.error('Google Sheets Error:', err);
    res.status(500).json({ error: 'Failed to access Google Sheets' });
  }
});

// ===== LOG A PASS OR ATTENDANCE RECORD =====
app.post('/log', async (req, res) => {
  const { studentId, studentName, action, location, timestamp } = req.body;

  if (!studentId || !studentName || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const spreadsheetId = process.env.SHEET_ID;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Logs!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp || new Date().toISOString(), studentId, studentName, action, location || '']],
      },
    });

    res.json({ status: 'Log recorded successfully' });
  } catch (err) {
    console.error('Log Error:', err);
    res.status(500).json({ error: 'Failed to log data' });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Premier Pass backend running on port ${PORT}`));
