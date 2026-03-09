const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');

// Middleware for auth can be added here if needed, 
// assuming frontend sends a token or admin status. For now, we will 
// implement the endpoints.

// -------------------------------------------------------------
// PUBLIC ROUTES
// -------------------------------------------------------------

// @route   GET /api/jobs
// @desc    Get all active jobs
// @access  Public
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });
        res.json({ success: true, count: jobs.length, data: jobs });
    } catch (err) {
        console.error('Error fetching jobs:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   POST /api/jobs/:id/apply
// @desc    Apply for a job
// @access  Public
router.post('/:id/apply', async (req, res) => {
    try {
        const { id } = req.params;
        const { applicantName, applicantEmail, applicantPhone, resumeLink } = req.body;

        if (!applicantName || !applicantEmail || !applicantPhone || !resumeLink) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields including the Google Drive resume link.' });
        }

        const job = await Job.findById(id);
        if (!job || !job.isActive) {
            return res.status(404).json({ success: false, message: 'Job not found or is no longer active.' });
        }

        // Optional: Check if the user has already applied with this email
        const existingApp = await JobApplication.findOne({ jobId: id, applicantEmail: applicantEmail.toLowerCase() });
        if (existingApp) {
            return res.status(400).json({ success: false, message: 'You have already applied for this position with this email.' });
        }

        const newApplication = new JobApplication({
            jobId: id,
            applicantName,
            applicantEmail,
            applicantPhone,
            resumeLink
        });

        await newApplication.save();

        res.status(201).json({ success: true, message: 'Application submitted successfully! We will get in touch soon.' });

    } catch (err) {
        console.error('Error submitting job application:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// -------------------------------------------------------------
// ADMIN ROUTES
// -------------------------------------------------------------

// @route   GET /api/jobs/admin/all
// @desc    Get all jobs (including inactive)
// @access  Admin
router.get('/admin/all', async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.json({ success: true, count: jobs.length, data: jobs });
    } catch (err) {
        console.error('Error fetching all jobs:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   POST /api/jobs
// @desc    Create a new job
// @access  Admin
router.post('/', async (req, res) => {
    try {
        const { title, description, location, type, requirements, isActive } = req.body;

        if (!title || !description || !location || !type) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const newJob = new Job({
            title,
            description,
            location,
            type,
            requirements: requirements || [],
            isActive: isActive !== undefined ? isActive : true
        });

        const savedJob = await newJob.save();
        res.status(201).json({ success: true, data: savedJob });
    } catch (err) {
        console.error('Error creating job:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   PUT /api/jobs/:id
// @desc    Update a job details / toggle active status
// @access  Admin
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedJob = await Job.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedJob) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        res.json({ success: true, data: updatedJob });
    } catch (err) {
        console.error('Error updating job:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   DELETE /api/jobs/:id
// @desc    Delete a job
// @access  Admin
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await Job.findByIdAndDelete(id);

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        // Potentially delete associated applications too
        await JobApplication.deleteMany({ jobId: id });

        res.json({ success: true, message: 'Job and its applications deleted successfully' });
    } catch (err) {
        console.error('Error deleting job:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   GET /api/jobs/admin/applications
// @desc    Get all job applications 
// @access  Admin 
router.get('/admin/applications', async (req, res) => {
    try {
        // Can optionally filter by ?jobId=...
        const { jobId } = req.query;
        let query = {};
        if (jobId) {
            query.jobId = jobId;
        }

        const applications = await JobApplication.find(query)
            .populate('jobId', 'title location') // Bring in some details of the job
            .sort({ createdAt: -1 });

        res.json({ success: true, count: applications.length, data: applications });
    } catch (err) {
        console.error('Error fetching job applications:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
