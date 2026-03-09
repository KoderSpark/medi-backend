const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    applicantName: {
        type: String,
        required: true,
        trim: true
    },
    applicantEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    applicantPhone: {
        type: String,
        required: true,
        trim: true
    },
    resumeLink: {
        type: String,
        required: true // User must provide a Google Drive link
    },
    status: {
        type: String,
        enum: ['Pending', 'Reviewed', 'Rejected', 'Accepted'],
        default: 'Pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
