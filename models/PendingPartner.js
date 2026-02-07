const mongoose = require('mongoose');

const pendingPartnerSchema = new mongoose.Schema(
    {
        name: { type: String },
        type: { type: String },
        address: { type: String },
        contactEmail: { type: String },
        contactPhone: { type: String },
        email: { type: String, unique: true, sparse: true },
        password: { type: String },
        city: { type: String },
        district: { type: String },
        state: { type: String },
        pincode: { type: String },
        responsible: {
            name: String,
            designation: String,
            age: Number,
            sex: String,
            dob: String,
        },
        council: {
            name: String,
            number: String,
        },
        specialization: { type: String },
        timings: { type: String },
        timeFrom: { type: String },
        timeTo: { type: String },
        dayFrom: { type: String },
        dayTo: { type: String },
        certificateFile: { type: String },
        clinicPhotos: { type: [String], default: [] },
        discountAmount: { type: String },
        discountItems: { type: [String], default: [] },
        rejectionReason: { type: String },
        membersServed: { type: Number, default: 0 },
        status: { type: String, default: 'Pending' },
        source: { type: String, default: 'admin_bulk' },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Hash password before saving
pendingPartnerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const bcrypt = require('bcryptjs');
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

module.exports = mongoose.model('PendingPartner', pendingPartnerSchema);
