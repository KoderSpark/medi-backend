const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Ensure correct config path for script runner relative to root

// Adjust path depending on where it's executed from
const envPath = require('path').resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const Admin = require('../models/Admin');

const runSeed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB successfully.');

        const adminData = {
            name: "Default Admin",
            email: "admin@medicostsaver.com",
            phone: "+91 9999999999",
            password: "medicostadmin2026", // Will be automatically hashed
            status: "Active"
        };

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log(`Admin with email ${adminData.email} already exists.`);
        } else {
            const admin = new Admin(adminData);
            await admin.save();
            console.log(`Admin account created successfully!`);
            console.log(`Email: ${adminData.email}`);
            console.log(`Password: ${adminData.password}`);
        }

        mongoose.connection.close();
        console.log('Database connection closed.');
    } catch (error) {
        console.error('Error seeding admin data:', error);
        mongoose.connection.close();
        process.exit(1);
    }
};

runSeed();
