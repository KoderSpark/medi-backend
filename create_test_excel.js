const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'test_files');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// 1. Valid File
const validData = [
    {
        "Category": "Cardiologist",
        "Source": "Internal",
        "Doctor's Name": "Dr. Valid Test",
        "Clinic/Institute Name": "Test Clinic A",
        "Address-1": "123 Valid St",
        "Address-2": "Suite 100",
        "Address-3": "Block A",
        "Distt.": "New Delhi",
        "City": "New Delhi",
        "State": "Delhi",
        "Pin Code": "110001",
        "Phone No.": "9876543210",
        "Resi. No.": "",
        "Fax No.": "",
        "E-Mail ID's": "test@valid.com",
        "Web Site": "www.valid.com",
        "Course": "MBBS, MD",
        "D.O.B.": "01/01/1980",
        "Institute": "AIIMS",
        "Specilisation": "Heart Surgery"
    },
    {
        "Category": "Dentist",
        "Source": "Internal",
        "Doctor's Name": "Dr. Valid Test 2",
        "Clinic/Institute Name": "Smile Clinic",
        "Address-1": "456 Tooth Rd",
        "Address-2": "",
        "Address-3": "",
        "Distt.": "Gurgaon",
        "City": "Gurgaon",
        "State": "Haryana",
        "Pin Code": "122001",
        "Phone No.": "9876543211",
        "Resi. No.": "",
        "Fax No.": "",
        "E-Mail ID's": "test2@valid.com",
        "Web Site": "",
        "Course": "BDS",
        "D.O.B.": "01/01/1985",
        "Institute": "MAMC",
        "Specilisation": "Root Canal"
    }
];

const wbValid = xlsx.utils.book_new();
const wsValid = xlsx.utils.json_to_sheet(validData);
xlsx.utils.book_append_sheet(wbValid, wsValid, "Doctors");
xlsx.writeFile(wbValid, path.join(outputDir, 'valid.xlsx'));
console.log('Created valid.xlsx');

// 2. Invalid Columns File
const invalidColsData = [
    {
        "Category": "General",
        "Gender": "Male", // INVALID COLUMN
        "Doctor's Name": "Dr. Invalid Col"
    }
];

const wbInvalid = xlsx.utils.book_new();
const wsInvalid = xlsx.utils.json_to_sheet(invalidColsData);
xlsx.utils.book_append_sheet(wbInvalid, wsInvalid, "Doctors");
xlsx.writeFile(wbInvalid, path.join(outputDir, 'invalid_cols.xlsx'));
console.log('Created invalid_cols.xlsx');

// 3. Empty Mandatory Fields File (Missing Name)
const emptyData = [
    {
        "Category": "General",
        "Doctor's Name": "", // EMPTY NAME
        "City": "Mumbai"
    }
];
const wbEmpty = xlsx.utils.book_new();
const wsEmpty = xlsx.utils.json_to_sheet(emptyData);
xlsx.utils.book_append_sheet(wbEmpty, wsEmpty, "Doctors");
xlsx.writeFile(wbEmpty, path.join(outputDir, 'empty_name.xlsx'));
console.log('Created empty_name.xlsx');
