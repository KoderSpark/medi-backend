const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema(
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
    website: { type: String },
    mobile1: { type: String }, // Primary is contactPhone, but requirement lists Mobile-1...4
    mobile2: { type: String },
    mobile3: { type: String },
    mobile4: { type: String },
    phone: { type: String }, // Landline?
    residentialPhone: { type: String },
    fax: { type: String },
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
    status: { type: String, enum: ['Pending', 'Active', 'Inactive', 'Rejected'], default: 'Active' },
    source: { type: String, enum: ['self', 'admin'], default: 'self' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hash password before saving
partnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const bcrypt = require('bcryptjs');
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
partnerSchema.methods.comparePassword = async function (candidatePassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Partner', partnerSchema);
