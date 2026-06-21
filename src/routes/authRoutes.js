const express = require('express');
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/login', redirectIfAuthenticated, authController.loginPage);
router.post('/login', redirectIfAuthenticated, authController.login);
router.post('/logout', authController.logout);

module.exports = router;
