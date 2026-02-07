const Partner = require('../models/Partner');
const PendingPartner = require('../models/PendingPartner');
const ActivityLog = require('../models/ActivityLog'); // Import Activity Log
const ApprovedPartner = require('../models/ApprovedPartner');
const Visit = require('../models/Visit');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Helper function to get MIME type from file extension
const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

exports.verifyMembership = async (req, res) => {
  try {
    const { membershipId } = req.body;
    const user = await User.findOne({ membershipId });
    if (!user) return res.status(404).json({ valid: false, message: 'Membership not found' });

    // return basic membership info
    // All members get 10% discount at partner facilities
    const discount = '10%';
    res.json({
      valid: true,
      member: {
        name: user.name,
        membershipId: user.membershipId,
        plan: user.plan,
        familyMembers: user.familyMembers || 0,
        familyDetails: user.familyDetails || [],
        discount,
        validUntil: user.validUntil,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.recordVisit = async (req, res) => {
  try {
    const { membershipId, partnerId, service, discountApplied, savedAmount } = req.body;
    const user = await User.findOne({ membershipId });
    if (!user) return res.status(404).json({ message: 'Member not found' });

    const visit = new Visit({ user: user._id, partner: partnerId, service, discountApplied, savedAmount });
    await visit.save();

    // Increment the partner's membersServed count
    await Partner.findByIdAndUpdate(partnerId, { $inc: { membersServed: 1 } });

    res.status(201).json(visit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserVisits = async (req, res) => {
  try {
    // Get user ID from auth middleware
    const userId = req.userId;

    const visits = await Visit.find({ user: userId })
      .populate('partner', 'name type address responsible')
      .sort({ createdAt: -1 })
      .limit(10);

    const formattedVisits = visits.map(visit => ({
      id: visit._id,
      hospitalName: visit.partner?.name || 'Unknown Hospital',
      doctorName: visit.partner?.responsible?.name || 'Not specified',
      address: visit.partner?.address || 'Address not available',
      visitedTime: visit.createdAt.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      service: visit.service || 'General Consultation'
    }));

    res.json(formattedVisits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPartnerStats = async (req, res) => {
  try {
    // Get partner from JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const partnerId = decoded.id;

    const partner = await Partner.findById(partnerId);
    if (!partner) return res.status(404).json({ message: 'Partner not found' });

    // Get visit count for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyVisits = await Visit.countDocuments({
      partner: partnerId,
      createdAt: { $gte: startOfMonth }
    });

    res.json({
      membersServed: partner.membersServed || 0,
      monthlyVisits,
      totalRevenue: 0, // This would need to be calculated from visits
      averageDiscount: '12.5%' // This could be calculated from visit data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listPartners = async (req, res) => {
  try {
    const { q, type, state, district, specialization, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    let query = { status: 'Active' };

    if (q && q.trim()) {
      query.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { clinicName: { $regex: q.trim(), $options: 'i' } },
        { specialization: { $regex: q.trim(), $options: 'i' } },
        { address: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (state) {
      query.state = { $regex: `^${state.trim()}$`, $options: 'i' };
    }

    if (district) {
      query.district = { $regex: `^${district.trim()}$`, $options: 'i' };
    }

    if (specialization && specialization !== 'all') {
      query.specialization = { $regex: `^${specialization.trim()}$`, $options: 'i' };
    }

    // Get total count for pagination
    const totalPartners = await Partner.countDocuments(query);

    // Get paginated results
    const partners = await Partner.find(query)
      .select('name type clinicName specialization address state district contactPhone contactEmail discountAmount discountItems timings timeFrom timeTo dayFrom dayTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalPartners / limit);

    res.json({
      partners,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPartners,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: list pending partner applications - DEPRECATED
exports.listApplications = async (req, res) => {
  res.json([]);
};

// Admin: approve an application - DEPRECATED
exports.approveApplication = async (req, res) => {
  res.status(410).json({ message: 'Feature removed' });
};

// Admin: reject an application - DEPRECATED
exports.rejectApplication = async (req, res) => {
  res.status(410).json({ message: 'Feature removed' });
};

// Register a new partner (self-service)
exports.register = async (req, res) => {
  try {
    // Accept multipart/form-data: fields in req.body, files in req.files (multer memoryStorage)
    const {
      role,
      responsibleName,
      responsibleAge,
      responsibleSex,
      responsibleDOB,
      address,
      timings,
      website,
      contactEmail,
      contactPhone,
      email,
      password,
      councilName,
      councilNumber,
      state,
      district,
      city,
      pincode,
      clinicName,
      specialization,
      designation,
      timeFrom,
      timeTo,
      dayFrom,
      dayTo,
      discountAmount,
      discountItems,
    } = req.body;

    if (!responsibleName || !contactEmail || !email || !password) return res.status(400).json({ message: 'Missing required fields' });

    const partner = new Partner({
      name: clinicName || responsibleName,
      type: role || 'partner',
      address,
      contactEmail,
      contactPhone,
      email,
      password,
      district,
      city,
      state,
      pincode,
      responsible: {
        name: responsibleName,
        designation,
        age: responsibleAge ? Number(responsibleAge) : undefined,
        age: responsibleAge ? Number(responsibleAge) : undefined,
        sex: responsibleSex,
        dob: responsibleDOB,
      },
      council: {
        name: councilName,
        number: councilNumber,
      },
      specialization,
      timings: timings || undefined,
      timeFrom: timeFrom || undefined,
      timeTo: timeTo || undefined,
      dayFrom: dayFrom || undefined,
      dayTo: dayTo || undefined,
      clinicName: clinicName || undefined,
      discountAmount,
      discountItems: discountItems ? JSON.parse(discountItems) : [],
      source: 'self',
    });

    await partner.save();

    // handle files: req.files contains buffers from multer memoryStorage
    const files = req.files || {};

    // certificateFile
    if (files.certificateFile && files.certificateFile.length > 0) {
      const f = files.certificateFile[0];
      const mimeType = getMimeType(f.originalname);
      const base64 = f.buffer.toString('base64');
      partner.certificateFile = `data:${mimeType};base64,${base64}`;
    }

    // clinicPhotos (multiple)
    if (files.clinicPhotos && files.clinicPhotos.length > 0) {
      partner.clinicPhotos = [];
      files.clinicPhotos.forEach((f) => {
        const mimeType = getMimeType(f.originalname);
        const base64 = f.buffer.toString('base64');
        partner.clinicPhotos.push(`data:${mimeType};base64,${base64}`);
      });
    }

    await partner.save();

    res.status(201).json({ message: 'Partner registered', partner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get dashboard stats
exports.getStats = async (req, res) => {
  try {
    const approvedPartnersCount = await Partner.countDocuments({ status: 'Active' });
    const totalUsersCount = await User.countDocuments();

    res.json({
      approvedPartners: approvedPartnersCount,
      pendingSelf: 0, // Deprecated
      pendingAdmin: 0, // Deprecated
      totalUsers: totalUsersCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get recent members
exports.getRecentMembers = async (req, res) => {
  try {
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name plan familyMembers createdAt status');

    const formattedMembers = recentUsers.map(user => ({
      name: user.name,
      plan: user.plan + (user.familyMembers > 0 ? ` (${user.familyMembers} family)` : ''),
      date: user.createdAt.toISOString().split('T')[0],
      status: user.status
    }));

    res.json(formattedMembers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get recent partners
exports.getRecentPartners = async (req, res) => {
  try {
    const recentPartners = await Partner.find({ status: 'Active' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name type membersServed createdAt');

    const formattedPartners = recentPartners.map(partner => ({
      name: partner.name,
      type: partner.type,
      members: partner.membersServed || 0,
      status: 'Active'
    }));

    res.json(formattedPartners);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};;

exports.getPartnerVisits = async (req, res) => {
  try {
    // Get partner from JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const partnerId = decoded.id;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalVisits = await Visit.countDocuments({ partner: partnerId });

    const visits = await Visit.find({ partner: partnerId })
      .populate('user', 'name membershipId email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedVisits = visits.map(visit => ({
      id: visit._id,
      memberName: visit.user?.name || 'Unknown Member',
      membershipId: visit.user?.membershipId || 'N/A',
      email: visit.user?.email || 'N/A',
      phone: visit.user?.phone || 'N/A',
      service: visit.service || 'General Service',
      discount: `${visit.discountApplied}%`,
      savedAmount: visit.savedAmount || 0,
      date: visit.createdAt.toLocaleDateString('en-IN'),
      time: visit.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }));

    const totalPages = Math.ceil(totalVisits / limit);

    res.json({
      visits: formattedVisits,
      pagination: {
        currentPage: page,
        totalPages,
        totalVisits,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Partner login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const partner = await Partner.findOne({ email, status: 'Active' });
    if (!partner) return res.status(401).json({ message: 'Invalid credentials or account not approved yet' });
    const match = await partner.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: partner._id, email: partner.email, type: 'partner' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, partner: { id: partner._id, email: partner.email, name: partner.name, type: partner.type } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users with pagination (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    let filter = {};
    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { membershipId: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(filter)
      .select('name email membershipId plan validUntil createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    });
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all active partners with pagination (Admin only) - ALL ACTIVE PARTNERS
exports.getAllPartners = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const source = req.query.source || '';

    let filter = {};
    if (source === 'admin' || source === 'self') {
      filter.source = source;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { clinicName: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    const partners = await Partner.find(filter)
      .select('name email clinicName type address contactPhone contactEmail membersServed status createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Partner.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      partners,
      pagination: {
        currentPage: page,
        totalPages,
        totalPartners: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    });
  } catch (err) {
    console.error('Get all partners error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete partner (Admin only)
exports.deletePartner = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);

    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    res.json({ message: 'Partner deleted successfully' });
  } catch (err) {
    console.error('Delete partner error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Bulk upload users from Excel
exports.bulkUploadUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const xlsx = require('xlsx');
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Excel sheet is empty' });
    }

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    const errors = [];
    const skipped = [];
    const createdUsers = [];

    // Helper to format date if needed
    // Excel dates are sometimes numbers
    const parseDate = (val) => {
      if (!val) return undefined;
      // If it's a number (Excel serial date), convert to JS Date
      if (typeof val === 'number') {
        // Excel counts days from 1900-01-01, but has a leap year bug for 1900
        // (JS Date starts 1970). 
        // Simplified approximation or use library helper if critical accuracy needed.
        return new Date(Math.round((val - 25569) * 86400 * 1000));
      }
      return new Date(val);
    };

    for (const row of data) {
      try {
        // Expected columns: Name, Email, Phone, Password (optional), Plan (optional), FamilyMembers (optional)
        // Adjust keys based on Excel headers (case-insensitive checking might be good but let's assume standard headers for now)
        const name = row['Name'] || row['name'];
        let rawEmail = row['E-mail'] || row['e-mail'] || row['Email'] || row['email'];
        // Handle multiple emails: take the first one
        const email = rawEmail ? String(rawEmail).split(/[;, ]+/)[0].trim().toLowerCase() : undefined;
        const phone = row['Phone'] || row['phone'];
        let password = row['Password'] || row['password'];
        const plan = row['Plan'] || row['plan'] || 'annual';
        const familyMembers = row['FamilyMembers'] || row['familyMembers'] || 0;

        // Check if user exists (only if email or phone is provided)
        const duplicateCheck = [];
        if (email) duplicateCheck.push({ email: email });
        if (phone) duplicateCheck.push({ phone: phone });

        if (duplicateCheck.length > 0) {
          const existingUser = await User.findOne({
            $or: duplicateCheck
          });

          if (existingUser) {
            skippedCount++;
            skipped.push({ row, reason: `User already exists with email ${email || 'N/A'} or phone ${phone || 'N/A'}` });
            continue;
          }
        }

        // Generate password if not provided
        // Format: MCS@<last 4 digits of phone> or random
        if (!password) {
          if (phone) {
            password = `MCS@${String(phone).slice(-4)}`;
          } else {
            password = `MCS@${Math.floor(1000 + Math.random() * 9000)}`;
          }
        }

        // Create user
        const newUser = new User({
          name,
          email,
          phone,
          password, // Will be hashed by pre-save hook
          plan: plan.toLowerCase(),
          familyMembers: Number(familyMembers),
          status: 'Active',
          validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // Default 1 year validity
        });

        await newUser.save();
        successCount++;
        createdUsers.push({ name, email, membershipId: newUser.membershipId });

      } catch (err) {
        failureCount++;
        errors.push({
          row: row,
          error: err.message
        });
      }
    }

    res.json({
      message: 'Bulk upload processing complete',
      summary: {
        total: data.length,
        success: successCount,
        skipped: skippedCount,
        failure: failureCount
      },
      createdUsers,
      skipped,
      errors
    });

  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ message: 'Server error processing file' });
  }
};

// Bulk upload partners from Excel
exports.bulkUploadPartners = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const xlsx = require('xlsx');
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Excel sheet is empty' });
    }

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    const errors = [];
    const skipped = [];
    const createdPartners = [];

    for (const row of data) {
      try {
        // Expected columns: Name, E-mail, Category/ Specialization, Designation, City, Address, Phone, Password(optional)
        const name = row['Name'] || row['name'];
        let rawEmail = row['E-mail'] || row['e-mail'] || row['Email'] || row['email'];
        // Handle multiple emails: take the first one
        const email = rawEmail ? String(rawEmail).split(/[;, ]+/)[0].trim().toLowerCase() : undefined;
        const specialization = row['Category/ Specialization'] || row['Category'] || row['category'] || row['Specialization'] || row['specialization'];
        const designation = row['Designation'] || row['designation'];
        const city = row['City'] || row['city'];
        const address = row['Address'] || row['address'];
        const phone = row['Phone'] || row['phone'];
        let password = row['Password'] || row['password'];

        // Check if partner exists (only if email or phone is provided)
        const duplicateCheck = [];
        if (email) duplicateCheck.push({ email: email });
        if (phone) duplicateCheck.push({ contactPhone: phone });

        if (duplicateCheck.length > 0) {
          const existingPartner = await Partner.findOne({
            $or: duplicateCheck
          });

          if (existingPartner) {
            skippedCount++;
            skipped.push({ row, reason: `Partner already exists with email ${email || 'N/A'} or phone ${phone || 'N/A'}` });
            continue;
          }
        }

        // Generate password if not provided
        if (!password) {
          if (phone) {
            password = `MED@${String(phone).slice(-4)}`;
          } else {
            // Generate random 4 digits if no phone
            password = `MED@${Math.floor(1000 + Math.random() * 9000)}`;
          }
        }

        const partner = new PendingPartner({
          name: name, // Using name as responsible name/clinic name
          type: 'doctor', // Assuming bulk upload is for doctors primarily
          email: email.toLowerCase(),
          contactEmail: email.toLowerCase(),
          contactPhone: phone,
          password: password,
          address: address,
          city: city,
          responsible: {
            name: name,
            designation: designation
          },
          specialization: specialization,
          discountAmount: '0%', // Default
          discountItems: [],    // Default
          status: 'Pending',    // Set to Pending for admin review
          source: 'admin_bulk'
        });

        await partner.save();
        successCount++;
        createdPartners.push({ name, email });

      } catch (err) {
        failureCount++;
        errors.push({
          row: row,
          error: err.message
        });
      }
    }

    res.json({
      message: 'Bulk upload processing complete',
      summary: {
        total: data.length,
        success: successCount,
        skipped: skippedCount,
        failure: failureCount
      },
      createdPartners,
      skipped,
      errors
    });

  } catch (err) {
    console.error('Bulk upload partners error:', err);
    res.status(500).json({ message: 'Server error processing file' });
  }
};

// Admin: list admin-added pending partner applications
exports.listAdminApplications = async (req, res) => {
  try {
    const apps = await PendingPartner.find().sort({ createdAt: -1 }).limit(200);
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: approve an admin-added application
exports.approveAdminApplication = async (req, res) => {
  try {
    const id = req.params.id;
    const pending = await PendingPartner.findById(id);
    if (!pending) return res.status(404).json({ message: 'Application not found' });

    // Move to Partner collection
    const partnerData = pending.toObject();
    delete partnerData._id;
    partnerData.status = 'Active';
    partnerData.source = 'admin';

    const partner = new Partner(partnerData);
    await partner.save();

    // Remove from PendingPartner collection
    await PendingPartner.findByIdAndDelete(id);

    // Log the action
    await ActivityLog.create({
      action: 'PARTNER_APPROVED',
      description: `Admin approved partner application for ${partner.name}`,
      actorModel: 'Admin', // Assuming req.user/admin info is available or generic 'Admin'
      targetId: partner._id,
      targetModel: 'Partner'
    });

    res.json({ message: 'Application approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: reject an admin-added application
exports.rejectAdminApplication = async (req, res) => {
  try {
    const id = req.params.id;
    const pending = await PendingPartner.findById(id);
    if (!pending) return res.status(404).json({ message: 'Application not found' });

    await PendingPartner.findByIdAndDelete(id);

    // Log the action
    await ActivityLog.create({
      action: 'PARTNER_REJECTED',
      description: `Admin rejected partner application for ${pending.name || 'Applicant'}`,
      actorModel: 'Admin',
      // targetId could be null since we deleted the pending record, or keep it generic
    });

    res.json({ message: 'Application rejected and removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get Partner Profile
exports.getProfile = async (req, res) => {
  try {
    const partnerId = req.partnerId; // valid from auth/isPartner middleware
    const partner = await Partner.findById(partnerId).select('-password');

    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    res.json(partner);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Partner Profile
exports.updateProfile = async (req, res) => {
  try {
    const partnerId = req.partnerId;
    const updates = req.body;

    // Fields that cannot be updated by partner
    const restrictedFields = [
      'status',
      'source',
      'membersServed',
      'createdAt',
      'password',
      'email', // Email usually requires verification to change
      // 'certificateFile', // Handled conditionally below
      'rejectionReason'
    ];

    // Remove restricted fields
    restrictedFields.forEach(field => delete updates[field]);

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    // Update Basic Info
    if (updates.specialization) partner.specialization = updates.specialization;
    if (updates.name) partner.name = updates.name; // Clinic Name
    if (updates.clinicName) partner.clinicName = updates.clinicName;
    if (updates.type) partner.type = updates.type;

    // Address & Location
    if (updates.address) partner.address = updates.address;
    if (updates.district) partner.district = updates.district;
    if (updates.city) partner.city = updates.city;
    if (updates.state) partner.state = updates.state;
    if (updates.pincode) partner.pincode = updates.pincode;

    // Contact
    if (updates.contactPhone) {
      partner.contactPhone = updates.contactPhone;
      partner.mobile1 = updates.contactPhone;
    }
    if (updates.mobile1) {
      partner.mobile1 = updates.mobile1;
      partner.contactPhone = updates.mobile1;
    }
    if (updates.contactEmail) partner.contactEmail = updates.contactEmail;

    if (updates.website) partner.website = updates.website;
    if (updates.mobile2) partner.mobile2 = updates.mobile2;
    if (updates.mobile3) partner.mobile3 = updates.mobile3;
    if (updates.mobile4) partner.mobile4 = updates.mobile4;
    if (updates.phone) partner.phone = updates.phone;
    if (updates.residentialPhone) partner.residentialPhone = updates.residentialPhone;
    if (updates.fax) partner.fax = updates.fax;

    // Responsible Person
    if (updates.responsible) {
      if (!partner.responsible) partner.responsible = {};
      if (updates.responsible.name) partner.responsible.name = updates.responsible.name;
      if (updates.responsible.designation) partner.responsible.designation = updates.responsible.designation;
      if (updates.responsible.dob) partner.responsible.dob = updates.responsible.dob;
      if (updates.responsible.age) partner.responsible.age = updates.responsible.age;
      if (updates.responsible.sex) partner.responsible.sex = updates.responsible.sex;
    }

    // Council
    if (updates.council) {
      if (!partner.council) partner.council = {};
      if (updates.council.name) partner.council.name = updates.council.name;
      if (updates.council.number) partner.council.number = updates.council.number;
    }

    // Timings
    if (updates.timings) partner.timings = updates.timings;
    if (updates.timeFrom) partner.timeFrom = updates.timeFrom;
    if (updates.timeTo) partner.timeTo = updates.timeTo;
    if (updates.dayFrom) partner.dayFrom = updates.dayFrom;
    if (updates.dayTo) partner.dayTo = updates.dayTo;

    // Discount
    if (updates.discountAmount) partner.discountAmount = updates.discountAmount;
    if (updates.discountItems) partner.discountItems = updates.discountItems;

    await partner.save();

    res.json({ message: 'Profile updated successfully', partner });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
