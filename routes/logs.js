const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Create a log entry
router.post('/', async (req, res) => {
  const { user_id, action, details } = req.body;

  const { data, error } = await supabase
    .from('logs')
    .insert([{ user_id, action, details }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get logs
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
