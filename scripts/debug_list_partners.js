
const mongoose = require('mongoose');
require('dotenv').config();
const Partner = require('../models/Partner');

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI missing");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("Connected to DB. Listing all Partners...");

        const partners = await Partner.find({});
        console.log(`Found ${partners.length} partners.`);

        partners.forEach(p => {
            console.log("---------------------------------------------------");
            console.log(`ID: ${p._id}`);
            console.log(`Name: ${p.name}`);
            console.log(`Email: ${p.email}`);
            console.log(`Type: ${p.type}`);
            console.log(`Status: ${p.status}`);
            console.log(`FacilityType: ${p.facilityType} (should not be used if type is set)`);
        });

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

run();
