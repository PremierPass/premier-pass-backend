const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Sign in student
router.post('/sign-in', async (req, res) => {
  const { user_id } = req.body;
  const date = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance')
    .insert([{ user_id, date, sign_in: new Date(), status: 'present' }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Sign out student
router.post('/sign-out', async (req, res) => {
  const { user_id } = req.body;
  const date = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance')
    .update({ sign_out: new Date(), status: 'out' })
    .eq('user_id', user_id)
    .eq('date', date);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
