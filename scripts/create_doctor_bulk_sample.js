
const xlsx = require('xlsx');
const path = require('path');

// Sample data using the EXACT column headers accepted by POST /api/doctors/upload
const data = [
    {
        "Doctor Name": "Dr. Rajesh Kumar",          // REQUIRED
        "City": "Mumbai",
        "State": "Maharashtra",
        "Address": "123, Health Street, Bandra",
        "E-mail": "rajesh.kumar@example.com",
        "Phone Number": "9876543210",
        "Category": "Cardiologist",
        "Designation": "Senior Consultant",
        "pincode": "400050",
        "website": "www.rajeshkumar.com"
    },
    {
        "Doctor Name": "Dr. Anjali Gupta",
        "City": "Delhi",
        "State": "Delhi",
        "Address": "456, Care Lane, Dwarka",
        "E-mail": "anjali.gupta@example.com",
        "Phone Number": "8765432109",
        "Category": "Dermatologist",
        "Designation": "Consultant",
        "pincode": "110075",
        "website": ""
    },
    {
        "Doctor Name": "Dr. Vivek Singh",
        "City": "Bangalore",
        "State": "Karnataka",
        "Address": "789, Bone Avenue, Indiranagar",
        "E-mail": "vivek.singh@example.com",
        "Phone Number": "7654321098",
        "Category": "Orthopedics",
        "Designation": "Head of Department",
        "pincode": "560038",
        "website": "www.viveksingh.in"
    }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Doctors");

const outputPath = path.join(__dirname, 'sample_doctors.xlsx');
xlsx.writeFile(wb, outputPath);

console.log(`Sample Excel file created at: ${outputPath}`);
console.log('Column headers:', Object.keys(data[0]).join(', '));
