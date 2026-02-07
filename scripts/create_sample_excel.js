const xlsx = require('xlsx');
const path = require('path');

const users = [
    { Name: "Test User 1", Email: "testuser1@example.com", Phone: "9876543210", Plan: "Annual", FamilyMembers: 2 },
    { Name: "Test User 2", Email: "testuser2@example.com", Phone: "9876543211", Plan: "Annual", FamilyMembers: 0 },
    { Name: "Test User 3", Email: "testuser3@example.com", Phone: "9876543212", Plan: "Annual", FamilyMembers: 1, Password: "password123" }
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(users);
xlsx.utils.book_append_sheet(wb, ws, "Users");

const outputPath = path.resolve(__dirname, '../../sample_users.xlsx');
xlsx.writeFile(wb, outputPath);

console.log(`Sample Excel file created at: ${outputPath}`);
