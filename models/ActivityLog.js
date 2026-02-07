const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g., 'PARTNER_APPROVED', 'PROFILE_UPDATE'
    description: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, refPath: 'actorModel' },
    actorModel: { type: String, enum: ['Admin', 'Partner'], default: 'Admin' },
    targetId: { type: mongoose.Schema.Types.ObjectId, refPath: 'targetModel' }, // Optional: affected entity
    targetModel: { type: String, enum: ['Partner', 'User'] },
    metadata: { type: Object }, // Optional: extra details like changed fields
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
