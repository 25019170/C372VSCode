const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.get('/admin/dashboard', isAdmin, adminController.dashboard);
router.get('/admin/users', isAdmin, adminController.listUsers);
router.get('/admin/users/:id', isAdmin, adminController.userDetails);
router.get('/admin/users/delete/:id', isAdmin, adminController.deleteUser);

module.exports = router;
