const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Create a new pass
router.post('/', async (req, res) => {
  const { user_id, location } = req.body;

  const { data, error } = await supabase
    .from('passes')
    .insert([{ user_id, location, status: 'queued' }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get all active passes
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('passes')
    .select('*')
    .neq('status', 'completed');

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
