// For actors (auditors)
router.get('/api/actors', async (req, res) => {
  try {
    const query = `
      SELECT actor_id, actor_name 
      FROM aawe.actors 
      WHERE status = 'A' 
      AND role_id = '22'
    `;
    const [actors] = await pool.query(query);
    res.json(actors);
  } catch (error) {
    console.error('Error fetching actors:', error);
    res.status(500).json({ error: 'Failed to fetch actors' });
  }
});

// For customers (clients)
router.get('/api/customers', async (req, res) => {
  try {
    const query = `
      SELECT customer_id, customer_name 
      FROM aawe.customers 
      WHERE status = 'A'
    `;
    const [customers] = await pool.query(query);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
}); 