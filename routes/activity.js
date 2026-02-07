const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const isAdmin = require('../middlewares/isAdmin');
const isPartner = require('../middlewares/isPartner');

// Admin route
router.get('/admin', isAdmin, activityController.getAdminLogs);

// Partner route
router.get('/partner', isPartner, activityController.getPartnerLogs);

module.exports = router;
