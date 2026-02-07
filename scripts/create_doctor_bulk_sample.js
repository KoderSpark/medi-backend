
const xlsx = require('xlsx');
const path = require('path');

const data = [
    {
        "Name": "Dr. Rajesh Kumar",
        "E-mail": "rajesh.kumar@example.com",
        "Category/ Specialization": "Cardsiology",
        "Designation": "Senior Consultant",
        "City": "Mumbai",
        "Address": "123, Health Street, Bandra",
        "Phone": "9876543210"
    },
    {
        "Name": "Dr. Anjali Gupta",
        "E-mail": "anjali.gupta@example.com",
        "Category/ Specialization": "Dermatology",
        "Designation": "Consultant",
        "City": "Delhi",
        "Address": "456, Care Lane, Dwarka",
        "Phone": "8765432109"
    },
    {
        "Name": "Dr. Vivek Singh",
        "E-mail": "vivek.singh@example.com",
        "Category/ Specialization": "Orthopedics",
        "Designation": "Head of Department",
        "City": "Bangalore",
        "Address": "789, Bone Avenue, Indiranagar",
        "Phone": "7654321098"
    }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Doctors");

const outputPath = path.join(__dirname, 'sample_doctors.xlsx');
xlsx.writeFile(wb, outputPath);

console.log(`Sample Excel file created at: ${outputPath}`);
