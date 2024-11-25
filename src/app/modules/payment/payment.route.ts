import express from 'express';

const router = express.Router();

router.get('/callback', (req, res) => {
  res.send('callback hit');
});

export const PaymentRoutes = router;
