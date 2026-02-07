const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');
const multer = require('multer');
const isAdmin = require('../middlewares/isAdmin');
const isPartner = require('../middlewares/isPartner');
const auth = require('../middlewares/auth');

// Use memory storage; controller will persist files to disk under uploads/partners/<id>/
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/verify', isPartner, partnerController.verifyMembership);
router.post('/visit', isPartner, partnerController.recordVisit);
// fields: certificateFile (single), clinicPhotos (array)
router.post('/register', upload.fields([
	{ name: 'certificateFile', maxCount: 1 },
	{ name: 'clinicPhotos', maxCount: 6 },
]), partnerController.register);
router.get('/', partnerController.listPartners);

// Admin routes - list pending applications, approve/reject - DEPRECATED/REMOVED
// router.get('/applications', isAdmin, partnerController.listApplications);
// router.post('/applications/:id/approve', isAdmin, partnerController.approveApplication);
// router.post('/applications/:id/reject', isAdmin, partnerController.rejectApplication);

// Admin routes for admin-added pending partners (strict separation) - DEPRECATED/REMOVED
// router.get('/admin-pending', isAdmin, partnerController.listAdminApplications);
// router.post('/admin-pending/:id/approve', isAdmin, partnerController.approveAdminApplication);
// router.post('/admin-pending/:id/reject', isAdmin, partnerController.rejectAdminApplication);

// Admin: get dashboard stats
router.get('/stats', isAdmin, partnerController.getStats);
router.get('/recent-members', isAdmin, partnerController.getRecentMembers);
router.get('/recent-partners', isAdmin, partnerController.getRecentPartners);
router.get('/all-users', isAdmin, partnerController.getAllUsers);
router.get('/all-partners', isAdmin, partnerController.getAllPartners);
router.delete('/partners/:id', isAdmin, partnerController.deletePartner);
router.delete('/users/:id', isAdmin, partnerController.deleteUser);
router.post('/bulk-users', isAdmin, upload.single('file'), partnerController.bulkUploadUsers);
router.post('/bulk-partners', isAdmin, upload.single('file'), partnerController.bulkUploadPartners);

// Partner login
router.post('/login', partnerController.login);

// User visits
router.get('/my-visits', auth, partnerController.getUserVisits);

// Partner stats
router.get('/partner-stats', isPartner, partnerController.getPartnerStats);
router.get('/partner-visits', isPartner, partnerController.getPartnerVisits);

// Partner Profile (New)
router.get('/profile', isPartner, partnerController.getProfile);
router.put('/profile', isPartner, partnerController.updateProfile);

module.exports = router;
