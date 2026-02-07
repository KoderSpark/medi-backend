const fs = require('fs');
const path = require('path');

async function uploadFile(filename) {
    const filePath = path.join(__dirname, 'test_files', filename);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const boundary = '--------------------------' + Date.now().toString(16);

    // Construct valid multipart/form-data body
    const pre = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;
    const post = `\r\n--${boundary}--`;

    const body = Buffer.concat([
        Buffer.from(pre),
        fileBuffer,
        Buffer.from(post)
    ]);

    try {
        const response = await fetch('http://localhost:5000/api/doctors/upload', {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            },
            body: body
        });

        const data = await response.json();
        console.log(`Upload ${filename}:`, response.status);
        if (data.debugData) {
            console.log("DEBUG DATA KEY Sample:", JSON.stringify(Object.keys(data.debugData)));
        }
        if (data.DebugHeaders) {
            console.log("DEBUG HEADERS FROM SERVER:", JSON.stringify(data.DebugHeaders));
        }
        console.log("Message:", data.message);
    } catch (err) {
        console.error(`Error uploading ${filename}:`, err.message);
    }
}

async function runTests() {
    console.log("--- Starting Upload Tests ---");
    // Wait for server to potentially start
    await new Promise(r => setTimeout(r, 2000));

    console.log("\nTesting Valid File:");
    await uploadFile('valid.xlsx');

    console.log("\nTesting Invalid Columns File:");
    await uploadFile('invalid_cols.xlsx');

    console.log("\nTesting Empty Name File:");
    await uploadFile('empty_name.xlsx');
}

runTests();
