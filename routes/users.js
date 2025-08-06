const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Create a student
router.post('/create-student', async (req, res) => {
  const { name, class_name } = req.body;

  // Generate random 3-character alphanumeric code
  const code = Math.random().toString(36).substring(2, 5).toUpperCase();

  const { data, error } = await supabase
    .from('users')
    .insert([{ name, role: 'student', class_name, code }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get all users
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
