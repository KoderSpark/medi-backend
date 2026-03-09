const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String, // e.g., 'Remote', 'Hyderabad', etc.
        required: true
    },
    type: {
        type: String, // e.g., 'Full-time', 'Part-time', 'Contract'
        required: true
    },
    requirements: {
        type: [String], // Array of skills/requirements
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
