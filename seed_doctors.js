require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
const connectDB = require('./config/db');

// Sample Data
const doctors = [
    {
        name: "Dr. Sarah Smith",
        specialization: "Cardiologist",
        clinicName: "Heart Care Clinic",
        address1: "123 Health St",
        city: "New York",
        district: "Manhattan",
        state: "NY",
        pincode: "10001",
        phone: "555-0101",
        email: "sarah@heartcare.com",
        category: "Specialist"
    },
    {
        name: "Dr. John Doe",
        specialization: "Dentist",
        clinicName: "Smile Dental",
        address1: "456 Tooth Ave",
        city: "Brooklyn",
        district: "Kings",
        state: "NY",
        pincode: "11201",
        phone: "555-0202",
        email: "john@smiledental.com",
        category: "Dentist"
    },
    {
        name: "Dr. Emily Blunt",
        specialization: "Pediatrician",
        clinicName: "Kids Health Center",
        address1: "789 Child Lane",
        city: "Queens",
        district: "Queens",
        state: "NY",
        pincode: "11301",
        phone: "555-0303",
        email: "emily@kidshealth.com",
        category: "Specialist"
    },
    {
        name: "City General Hospital",
        specialization: "General Medicine",
        clinicName: "City General",
        address1: "101 Main Blvd",
        city: "New York",
        district: "Manhattan",
        state: "NY",
        pincode: "10002",
        phone: "555-0404",
        email: "info@citygeneral.com",
        category: "Hospital"
    }
];

const seedDoctors = async () => {
    try {
        // Connect to database
        if (process.env.MONGODB_URI) {
            await connectDB(process.env.MONGODB_URI);
        } else {
            console.error("MONGODB_URI is not defined in .env");
            process.exit(1);
        }

        // Clear existing data
        await Doctor.deleteMany();
        console.log('Cleared existing doctors...');

        // Insert new data
        await Doctor.insertMany(doctors);
        console.log('Doctors Seeded Successfully!');

        process.exit();
    } catch (error) {
        console.error('Error seeding doctors:', error);
        process.exit(1);
    }
};

seedDoctors();
