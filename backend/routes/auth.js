const express = require('express');
const router = express.Router();
const { register, login, getMe, getAllUsers, createUser, deleteUser } = require('../controllers/authController');
const { protect, authorise } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, authorise('admin'), getAllUsers);
router.post('/users', protect, authorise('admin'), createUser);
router.delete('/users/:id', protect, authorise('admin'), deleteUser);

module.exports = router;
