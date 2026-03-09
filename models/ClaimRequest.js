const mongoose = require('mongoose');

const claimRequestSchema = new mongoose.Schema(
    {
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
        requestedBy: {
            name: { type: String, required: true, trim: true },
            email: { type: String, required: true, trim: true, lowercase: true },
            phone: { type: String, required: true, trim: true },
        },
        // We could store file URLs if they need to upload ID/proof to claim
        documents: [{ type: String }],
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ClaimRequest', claimRequestSchema);
