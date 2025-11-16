const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

router.get('/messaggi', isAuthenticated, (req, res) => {
  res.render('pages/messaggi', {
    currentPage: 'messaggi',
    studioNome: req.session.studioNome
  });
});

module.exports = router;
