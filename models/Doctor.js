const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
    {
        category: { type: String, trim: true },       // e.g., "Dentist", "Cardiologist"
        designation: { type: String, trim: true },    // e.g., "Senior Consultant", "HOD"
        source: { type: String, default: 'admin_upload' },
        name: { type: String, required: true, trim: true },
        clinicName: { type: String, trim: true },
        address1: { type: String, trim: true },       // primary address (from "Address" column)
        address2: { type: String, trim: true },
        address3: { type: String, trim: true },
        district: { type: String, trim: true, index: true },
        city: { type: String, trim: true, index: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true, index: true },
        phone: { type: String, trim: true },          // from "Phone Number" column
        resPhone: { type: String, trim: true },
        fax: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        dob: { type: String, trim: true },
        website: { type: String, trim: true },
        course: { type: String, trim: true },
        institute: { type: String, trim: true },
        specialization: { type: String, trim: true, index: true },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Create compound index for faster text search if needed, though specific field indexes are usually enough for filters
doctorSchema.index({ name: 'text', clinicName: 'text', specialization: 'text' });

module.exports = mongoose.model('Doctor', doctorSchema);
