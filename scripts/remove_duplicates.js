require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../config/db');

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
// Find arguments that are not options
const positionalArgs = args.filter(arg => !arg.startsWith('--'));
const MODEL_NAME = positionalArgs[0] || 'Doctor';
const FIELD_NAME = positionalArgs[1] || 'email';

const AUDIT_FILE = path.join(__dirname, '..', `duplicate_removal_audit_${MODEL_NAME.toLowerCase()}_${FIELD_NAME}.json`);

const run = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB(process.env.MONGODB_URI);
    } else {
      console.error('MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    console.log(`\nStarting Duplicate Removal Script for Model: [${MODEL_NAME}] on field: [${FIELD_NAME}]`);
    if (isDryRun) {
      console.log('*** DRY RUN MODE ENABLED *** (No records will be deleted)\n');
    }

    // Attempt to load the model
    let Model;
    try {
      Model = require(`../models/${MODEL_NAME}`);
    } catch (err) {
      console.error(`Error loading model '${MODEL_NAME}'. Please make sure it exists in backend/models.`);
      process.exit(1);
    }

    // 1. Find duplicate entries using streaming cursor to avoid M0 memory limits
    console.log('Scanning documents...');
    const fieldToDocs = new Map();
    let totalScanned = 0;

    const query = {};
    query[FIELD_NAME] = { $exists: true, $ne: null, $ne: '' };
    
    const projection = { createdAt: 1 };
    projection[FIELD_NAME] = 1;

    const cursor = Model.find(query, projection).lean().cursor();

    for await (const doc of cursor) {
      if (!doc[FIELD_NAME]) continue;
      
      const fieldValue = String(doc[FIELD_NAME]).toLowerCase().trim();
      if (!fieldToDocs.has(fieldValue)) {
        fieldToDocs.set(fieldValue, []);
      }
      fieldToDocs.get(fieldValue).push({ _id: doc._id, createdAt: doc.createdAt });
      totalScanned++;
      if (totalScanned % 10000 === 0) {
        console.log(`Scanned ${totalScanned} documents...`);
      }
    }

    console.log(`Finished scanning ${totalScanned} documents. Finding duplicates...`);

    let totalDeleted = 0;
    const deletedAuditLog = [];
    let duplicateGroupsCount = 0;
    const idsToDelete = [];

    // 2. Iterate over mapped groups
    for (const [fieldValue, docs] of fieldToDocs.entries()) {
      if (docs.length > 1) {
        duplicateGroupsCount++;
        
        // Sort by createdAt (oldest first)
        docs.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });

        // Keep the first one (oldest)
        const recordToKeep = docs[0];
        const recordsToDelete = docs.slice(1);

        for (const doc of recordsToDelete) {
          deletedAuditLog.push({
            deletedAt: new Date().toISOString(),
            model: MODEL_NAME,
            reason: `Duplicate ${FIELD_NAME}`,
            keptRecordId: recordToKeep._id.toString(),
            deletedRecordId: doc._id.toString(),
            [FIELD_NAME]: fieldValue
          });

          idsToDelete.push(doc._id);
        }
      }
    }

    console.log(`Found ${duplicateGroupsCount} unique ${FIELD_NAME}s with duplicate entries.`);
    console.log(`Total records flagged for deletion: ${idsToDelete.length}`);

    // Perform bulk deletions
    if (!isDryRun && idsToDelete.length > 0) {
      console.log('Executing bulk deletion in batches...');
      const BATCH_SIZE = 5000;
      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batchIds = idsToDelete.slice(i, i + BATCH_SIZE);
        const result = await Model.deleteMany({ _id: { $in: batchIds } });
        totalDeleted += result.deletedCount;
        console.log(`Deleted batch ${i / BATCH_SIZE + 1} / ${Math.ceil(idsToDelete.length / BATCH_SIZE)} - (Deleted ${result.deletedCount} in this batch)`);
      }
    } else if (isDryRun) {
      totalDeleted = idsToDelete.length;
    }

    // 3. Save audit log
    if (deletedAuditLog.length > 0) {
      let existingLog = [];
      if (fs.existsSync(AUDIT_FILE)) {
        try { existingLog = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8')); } catch (e) {}
      }
      const updatedLog = existingLog.concat(deletedAuditLog);
      
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(updatedLog, null, 2), 'utf-8');
      console.log(`\nAudit log updated at: ${AUDIT_FILE}`);
    }

    if (isDryRun) {
      console.log(`\n[DRY RUN] Would have deleted ${totalDeleted} records.`);
    } else {
      console.log(`\n[SUCCESS] Deleted ${totalDeleted} duplicate records.`);
    }

    process.exit(0);

  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
};

run();
