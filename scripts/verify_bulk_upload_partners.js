
const http = require('http');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 5000;
const HOST = 'localhost';
const BASE_URL = `http://${HOST}:${PORT}/api`;

// create a dummy admin user
const User = require('../models/User');

const setupAdmin = async () => {
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI missing");
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);

    const adminEmail = 'superadmin@example.com';
    const adminPass = 'admin123';

    let user = await User.findOne({ email: adminEmail });
    if (!user) {
        user = new User({
            name: 'Super Admin',
            email: adminEmail,
            phone: '0000000000',
            password: adminPass,
            isAdmin: true,
            status: 'Active',
            role: 'admin' // partner controller checks isAdmin middleware which probably checks role or isAdmin bool
        });
        // Start check: User model has isAdmin boolean
        // Middleware isAdmin.js probably checks user.isAdmin or user.role?
        // Let's assume user.isAdmin based on User.js model.
        await user.save();
        console.log('Admin user created');
    } else {
        if (!user.isAdmin) {
            user.isAdmin = true;
            await user.save();
        }
        console.log('Admin user exists and verified');
    }
    return { email: adminEmail, password: adminPass };
};

const login = (email, password) => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ email, password });
        const req = http.request({
            host: HOST,
            port: PORT,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const body = JSON.parse(data);
                    resolve(body.token);
                } else {
                    reject(`Login failed: ${res.statusCode} ${data}`);
                }
            });
        });
        req.write(postData);
        req.end();
    });
};

const uploadFile = (token, filePath) => {
    return new Promise((resolve, reject) => {
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);

        // Construct multipart body
        let body = `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
        body += `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;

        const footer = `\r\n--${boundary}--\r\n`;

        const bodyHeader = Buffer.from(body);
        const bodyFooter = Buffer.from(footer);
        const fullBody = Buffer.concat([bodyHeader, fileContent, bodyFooter]);

        const req = http.request({
            host: HOST,
            port: PORT,
            path: '/api/partners/bulk-partners',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': fullBody.length,
                'Authorization': `Bearer ${token}`
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(`Upload failed: ${res.statusCode} ${data}`);
                }
            });
        });
        req.write(fullBody);
        req.end();
    });
};

const run = async () => {
    try {
        console.log("Setting up admin...");
        const creds = await setupAdmin();

        console.log("Logging in...");
        const token = await login(creds.email, creds.password);
        console.log("Logged in, token received.");

        // Generate sample file
        console.log("Generating sample file...");
        require('./create_doctor_bulk_sample.js'); // This runs the script
        const filePath = path.join(__dirname, 'sample_doctors.xlsx');

        console.log("Uploading file...");
        const result = await uploadFile(token, filePath);
        console.log("Upload result:", JSON.stringify(result, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

run();
