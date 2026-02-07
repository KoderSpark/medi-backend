const ActivityLog = require('../models/ActivityLog');

exports.getAdminLogs = async (req, res) => {
    try {
        const logs = await ActivityLog.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('actorId', 'name email') // Attempt to populate actor details if available
            .populate('targetId', 'name email');

        res.json(logs);
    } catch (err) {
        console.error('Fetch admin logs error:', err);
        res.status(500).json({ message: 'Server error fetching logs' });
    }
};

exports.getPartnerLogs = async (req, res) => {
    try {
        const partnerId = req.partnerId;

        // Fetch logs where the partner is the actor OR the target
        const logs = await ActivityLog.find({
            $or: [
                { actorId: partnerId, actorModel: 'Partner' },
                { targetId: partnerId, targetModel: 'Partner' }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('-metadata'); // Keep it clean for frontend

        res.json(logs);
    } catch (err) {
        console.error('Fetch partner logs error:', err);
        res.status(500).json({ message: 'Server error fetching logs' });
    }
};
