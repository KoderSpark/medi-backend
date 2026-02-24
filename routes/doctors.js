const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');

// @route   GET /api/doctors
// @desc    Get doctors with filters (public)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { service, location, limit = 50, page = 1 } = req.query;

        const query = {};

        // Filter by Service (Specialization or Category)
        if (service) {
            query.$or = [
                { specialization: { $regex: service, $options: 'i' } },
                { category: { $regex: service, $options: 'i' } },
                { name: { $regex: service, $options: 'i' } }, // Optional: allow searching by name too
                { clinicName: { $regex: service, $options: 'i' } }
            ];
        }

        // Filter by Location (City, District, Pincode)
        if (location) {
            if (query.$or) {
                // If we already have an $or from service, we need to AND it with location
                // BUT wait, user requirement says "Service AND Location" usually.
                // Let's assume strict filtering if both are present.
                // Mongoose query structure: { $and: [ { $or: [...] }, { $or: [...] } ] }
                // BUT simpler: just add to query object if independent.
                // If 'location' matches multiple fields, we need an $or for location specifically.

                const locationQuery = {
                    $or: [
                        { city: { $regex: location, $options: 'i' } },
                        { district: { $regex: location, $options: 'i' } },
                        { pincode: { $regex: location, $options: 'i' } },
                        { state: { $regex: location, $options: 'i' } },
                        { address1: { $regex: location, $options: 'i' } }
                    ]
                };

                // Combine with existing query
                // Since 'query' is an object, we can't easily append another $or if one exists at top level without $and
                // Let's restucture using $and for safety from the start if multiple search terms

                // Actually, let's rebuild query cleanly:
            }
        }

        // Re-do query construction properly
        const finalQuery = { $and: [] };

        // Service filter
        if (service) {
            finalQuery.$and.push({
                $or: [
                    { specialization: { $regex: service, $options: 'i' } },
                    { category: { $regex: service, $options: 'i' } },
                    { name: { $regex: service, $options: 'i' } },
                    { clinicName: { $regex: service, $options: 'i' } }
                ]
            });
        }

        // Location filter
        if (location) {
            finalQuery.$and.push({
                $or: [
                    { city: { $regex: location, $options: 'i' } },
                    { district: { $regex: location, $options: 'i' } },
                    { pincode: { $regex: location, $options: 'i' } },
                    { state: { $regex: location, $options: 'i' } },
                    { address1: { $regex: location, $options: 'i' } }
                ]
            });
        }

        // If no filters are applied, should we return everything? 
        // Requirement says: "Only show results when filters are applied."
        if (finalQuery.$and.length === 0) {
            return res.json({
                success: true,
                count: 0,
                data: [],
                message: "Please apply a filter to search for doctors."
            });
        }

        const skip = (page - 1) * limit;

        // Use the constructed query
        // If $and is empty, it would return all, but we handled that above.
        const doctors = await Doctor.find(finalQuery)
            .sort({ createdAt: -1 }) // Newest first? Or alpha? Let's go with created for now
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        const total = await Doctor.countDocuments(finalQuery);

        res.json({
            success: true,
            count: doctors.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: doctors
        });

    } catch (err) {
        console.error('Error fetching doctors:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   POST /api/doctors/upload
// @desc    Bulk upload doctors via Excel
// @access  Admin only
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(sheet, { defval: "" });

        if (rawData.length === 0) {
            return res.status(400).json({ success: false, message: "Excel file is empty" });
        }

        // STRICT Column Mapping & Validation
        // Required Excel columns for bulk doctor upload:
        const ALLOWED_COLUMNS = [
            "Doctor Name",    // → name (REQUIRED)
            "City",           // → city
            "State",          // → state
            "Address",        // → address1
            "E-mail",         // → email
            "Phone Number",   // → phone
            "Category",       // → category
            "Designation",    // → designation
            "pincode",        // → pincode
            "website"         // → website
        ];

        // Check headers — reject any column not in ALLOWED_COLUMNS
        const fileHeaders = Object.keys(rawData[0]);

        for (const header of fileHeaders) {
            const match = ALLOWED_COLUMNS.find(allowed => allowed.toLowerCase() === header.trim().toLowerCase());
            if (!match) {
                return res.status(400).json({
                    success: false,
                    message: `Upload rejected. Invalid column: "${header}". Allowed columns: ${ALLOWED_COLUMNS.join(', ')}`
                });
            }
        }

        const doctorsToInsert = rawData.map(row => {
            const getValue = (key) => {
                const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
                return foundKey ? String(row[foundKey]).trim() : "";
            };

            return {
                name: getValue("Doctor Name"),
                city: getValue("City"),
                state: getValue("State"),
                address1: getValue("Address"),
                email: getValue("E-mail"),
                phone: getValue("Phone Number"),
                category: getValue("Category"),
                designation: getValue("Designation"),
                pincode: getValue("pincode"),
                website: getValue("website"),
                source: "admin_upload",
            };
        });

        const validDoctors = doctorsToInsert.filter(d => d.name);

        if (validDoctors.length === 0) {
            return res.status(400).json({ success: false, message: "No valid doctor records found. 'Doctor Name' column is required." });
        }

        await Doctor.insertMany(validDoctors);

        res.json({
            success: true,
            message: `Successfully uploaded ${validDoctors.length} doctors.`,
            count: validDoctors.length
        });

    } catch (err) {
        console.error('Bulk upload error:', err);
        res.status(500).json({ success: false, message: 'Server Error during upload' });
    }
});

// @route   GET /api/doctors/admin
// @desc    Get doctors for admin directory with analytics and strict filtering
// @access  Admin only (Protected by auth middleware in index.js usually, but we check role here or assume admin)
router.get('/admin', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            name,
            clinic,
            specialization,
            category,
            city,
            district,
            state,
            pincode
        } = req.query;

        const matchStage = {
            source: "admin_upload"
        };

        // filters regex
        if (name) matchStage.name = { $regex: name, $options: 'i' };
        if (clinic) matchStage.clinicName = { $regex: clinic, $options: 'i' };
        if (specialization) matchStage.specialization = { $regex: specialization, $options: 'i' };
        if (category) matchStage.category = { $regex: category, $options: 'i' };
        if (city) matchStage.city = { $regex: city, $options: 'i' };
        if (district) matchStage.district = { $regex: district, $options: 'i' };
        if (state) matchStage.state = { $regex: state, $options: 'i' };
        if (pincode) matchStage.pincode = { $regex: pincode, $options: 'i' };

        const pipeline = [
            { $match: matchStage },
            {
                $facet: {
                    data: [
                        { $sort: { createdAt: -1 } },
                        { $skip: (parseInt(page) - 1) * parseInt(limit) },
                        { $limit: parseInt(limit) }
                    ],
                    totalCount: [
                        { $count: "count" }
                    ],
                    // Analytics Facets
                    bySpecialization: [
                        { $group: { _id: "$specialization", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ],
                    byCity: [
                        { $group: { _id: "$city", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ],
                    byState: [
                        { $group: { _id: "$state", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    byCategory: [
                        { $group: { _id: "$category", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ]
                }
            }
        ];

        const result = await Doctor.aggregate(pipeline);
        const facetResult = result[0];

        res.json({
            success: true,
            data: facetResult.data,
            total: facetResult.totalCount[0] ? facetResult.totalCount[0].count : 0,
            page: parseInt(page),
            pages: facetResult.totalCount[0] ? Math.ceil(facetResult.totalCount[0].count / parseInt(limit)) : 0,
            analytics: {
                specialization: facetResult.bySpecialization,
                city: facetResult.byCity,
                state: facetResult.byState,
                category: facetResult.byCategory
            }
        });

    } catch (err) {
        console.error('Error fetching admin doctor directory:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
