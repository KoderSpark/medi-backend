require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const seedAdmin = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI is not defined in .env");
            process.exit(1);
        }

        // Connect to database
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB successfully.');

        // Admin data to upload
        const adminData = {
            name: "Super Admin",
            email: "admin@medicostsaver.com",
            phone: "9999999999",
            password: "adminpassword123", // It will be automatically hashed by the pre-save hook
            status: "Active"
        };

        // Check if the admin already exists
        const existingAdmin = await Admin.findOne({ email: adminData.email });
        
        if (existingAdmin) {
            console.log(`Admin with email ${adminData.email} already exists.`);
        } else {
            console.log('Seeding new admin...');
            const admin = new Admin(adminData);
            await admin.save();
            console.log('Admin seeded successfully!');
            console.log('-----------------------------------');
            console.log(`Email: ${adminData.email}`);
            console.log(`Password: ${adminData.password}`);
            console.log('-----------------------------------');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
