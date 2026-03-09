const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
const Partner = require('../models/Partner');
const ClaimRequest = require('../models/ClaimRequest');
const bcrypt = require('bcryptjs');

// Helper to create token
const createToken = (partner, secret, expiresIn = '7d') => {
    return jwt.sign({ id: partner._id, email: partner.email }, secret, { expiresIn });
};

// In-memory store for OTPs (In production, use Redis or a DB collection with TTL)
const otpStore = new Map();

// Configure Nodemailer transporter
// You should set EMAIL_USER and EMAIL_PASS in your .env file
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// @route   POST /api/claims/otp
// @desc    Generate and send OTP to the doctor's registered email
// @access  Public
router.post('/otp', async (req, res) => {
    try {
        const { doctorId } = req.body;
        if (!doctorId) {
            return res.status(400).json({ success: false, message: 'Doctor ID is required' });
        }

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        if (doctor.isClaimed) {
            return res.status(400).json({ success: false, message: 'This clinic listing has already been claimed' });
        }

        if (!doctor.email) {
            return res.status(400).json({ success: false, message: 'No email found for this clinic. Please use the manual claim option.' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with an expiration timestamp (e.g., 10 minutes)
        otpStore.set(doctorId, {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
        });

        // Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: doctor.email,
            subject: 'Medio Cost Saver - Claim Your Clinic Verification',
            html: `
                <h3>Hello ${doctor.name},</h3>
                <p>You requested to claim your clinic listing on Medio Cost Saver.</p>
                <p>Your verification OTP is: <strong>${otp}</strong></p>
                <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
            `
        };

        // In a real environment with EMAIL_USER set, this sends the email.
        // For development/testing without credentials, we might just log it and return success.
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log(`[DEV MODE] OTP for ${doctor.email}: ${otp}`);
        }

        // Mask the email beautifully
        const maskEmail = (email) => {
            const [local, domain] = email.split('@');
            if (!domain) return email;
            const maskedLocal = local.length > 2 ? local.substring(0, 2) + '*'.repeat(local.length - 2) : local;
            return `${maskedLocal}@${domain}`;
        };

        res.json({
            success: true,
            message: 'OTP sent successfully',
            maskedEmail: maskEmail(doctor.email)
        });

    } catch (err) {
        console.error('Error sending OTP:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   POST /api/claims/verify
// @desc    Verify OTP and claim the clinic
// @access  Public
router.post('/verify', async (req, res) => {
    try {
        const { doctorId, otp, password } = req.body;

        if (!doctorId || !otp || !password) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const storedData = otpStore.get(doctorId);

        if (!storedData) {
            return res.status(400).json({ success: false, message: 'OTP expired or not requested' });
        }

        if (storedData.expiresAt < Date.now()) {
            otpStore.delete(doctorId);
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        if (storedData.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // OTP is valid. Now claim the clinic.
        const doctor = await Doctor.findById(doctorId);
        if (!doctor || doctor.isClaimed) {
            return res.status(400).json({ success: false, message: 'Clinic not found or already claimed' });
        }

        // Create a new Partner account based on Doctor info
        const newPartner = new Partner({
            name: doctor.name,
            type: doctor.category || 'Doctor',
            email: doctor.email.toLowerCase().trim(),
            password: password, // Will be hashed by pre-save hook
            contactEmail: doctor.email.toLowerCase().trim(),
            contactPhone: doctor.phone,
            phone: doctor.phone,
            city: doctor.city,
            district: doctor.district,
            state: doctor.state,
            pincode: doctor.pincode,
            address: doctor.address1,
            website: doctor.website,
            specialization: doctor.specialization,
            status: 'Active',
            source: 'admin' // They claimed an existing admin-uploaded listing
        });

        await newPartner.save();

        // Link the Partner to the Doctor listing
        doctor.isClaimed = true;
        doctor.claimedBy = newPartner._id;
        await doctor.save();

        // Clear the OTP
        otpStore.delete(doctorId);

        // Generate Token
        const token = createToken(newPartner, process.env.JWT_SECRET);

        res.json({
            success: true,
            message: 'Clinic claimed successfully',
            token,
            partner: { id: newPartner._id, email: newPartner.email, name: newPartner.name }
        });

    } catch (err) {
        console.error('Error verifying OTP:', err);
        if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
            return res.status(409).json({ success: false, message: "An account with this email already exists in the system. Please login instead." });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   POST /api/claims/manual
// @desc    Submit a manual claim request (when email/phone is inaccessible)
// @access  Public
router.post('/manual', async (req, res) => {
    try {
        const { doctorId, name, email, phone } = req.body;

        if (!doctorId || !name || !email || !phone) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        if (doctor.isClaimed) {
            return res.status(400).json({ success: false, message: 'This clinic listing has already been claimed' });
        }

        // Check if there's already a pending request for this doctor
        const existingRequest = await ClaimRequest.findOne({ doctorId, status: 'Pending' });
        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'A claim request for this clinic is already pending review' });
        }

        const newRequest = new ClaimRequest({
            doctorId,
            requestedBy: {
                name,
                email,
                phone
            }
        });

        await newRequest.save();

        res.json({
            success: true,
            message: 'Claim request submitted successfully. Our team will review and contact you shortly.'
        });

    } catch (err) {
        console.error('Error submitting manual claim:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   GET /api/claims/admin/pending
// @desc    Get all pending claim requests (Admin only)
// @access  Admin
router.get('/admin/pending', async (req, res) => {
    try {
        const claims = await ClaimRequest.find({ status: 'Pending' })
            .populate('doctorId')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: claims.length, data: claims });
    } catch (err) {
        console.error('Error fetching pending claims:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   POST /api/claims/admin/:id/action
// @desc    Approve or reject a manual claim request (Admin only)
// @access  Admin
router.post('/admin/:id/action', async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve' or 'reject'

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        const claim = await ClaimRequest.findById(id).populate('doctorId');
        if (!claim) {
            return res.status(404).json({ success: false, message: 'Claim request not found' });
        }

        if (claim.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'Claim is already ' + claim.status });
        }

        const doctor = claim.doctorId;

        if (action === 'reject') {
            claim.status = 'Rejected';
            await claim.save();
            return res.json({ success: true, message: 'Claim rejected successfully' });
        }

        // Action is approve
        if (doctor.isClaimed) {
            claim.status = 'Rejected';
            await claim.save();
            return res.status(400).json({ success: false, message: 'Clinic holds another approved claim. This request is auto-rejected.' });
        }

        // 1. Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8);

        // 2. Create the Partner account
        const newPartner = new Partner({
            name: doctor.name,
            type: doctor.category || 'Doctor',
            email: claim.requestedBy.email.toLowerCase().trim(),
            password: tempPassword,
            contactEmail: claim.requestedBy.email.toLowerCase().trim(),
            contactPhone: claim.requestedBy.phone,
            phone: claim.requestedBy.phone,
            city: doctor.city,
            district: doctor.district,
            state: doctor.state,
            pincode: doctor.pincode,
            address: doctor.address1,
            website: doctor.website,
            specialization: doctor.specialization,
            status: 'Active',
            source: 'admin' // Inherit directory listing source concept
        });

        await newPartner.save();

        // 3. Mark the doctor listing as claimed
        doctor.isClaimed = true;
        doctor.claimedBy = newPartner._id;
        await doctor.save();

        // 4. Update claim status
        claim.status = 'Approved';
        await claim.save();

        // 5. Email the partner their new credentials
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: claim.requestedBy.email,
            subject: 'Medio Cost Saver - Clinic Claim Approved',
            html: `
                <h3>Hello ${claim.requestedBy.name},</h3>
                <p>Your request to claim your clinic listing has been <strong>approved</strong>.</p>
                <p>You can now login to your Provider Dashboard with the following credentials:</p>
                <p><strong>Email:</strong> ${claim.requestedBy.email}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                <p>Please login and change your password immediately.</p>
            `
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log(`[DEV MODE] Claim Approved. Email to: ${claim.requestedBy.email}, Temp Pass: ${tempPassword}`);
        }

        res.json({ success: true, message: 'Claim approved and credentials emailed' });

    } catch (err) {
        console.error('Error actioning claim:', err);
        if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
            return res.status(409).json({ success: false, message: "An account with this email already exists in the system. Could not create partner." });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
