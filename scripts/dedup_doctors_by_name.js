/**
 * dedup_doctors_by_name.js
 *
 * Removes duplicate Doctor records that share the same normalized name.
 * Normalization: UPPERCASE + collapse all whitespace + trim.
 *
 * Strategy: For each group of same-name doctors, keep the record that has
 * the most non-empty fields (richest data). If tied, keep the oldest (_id).
 *
 * Usage:
 *   node scripts/dedup_doctors_by_name.js            ← actually deletes
 *   node scripts/dedup_doctors_by_name.js --dry-run  ← preview only
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');

const isDryRun = process.argv.includes('--dry-run');

// Count how many non-empty fields a doc has (higher = richer)
function richness(doc) {
  const fields = [
    'name', 'clinicName', 'address1', 'address2', 'address3',
    'district', 'city', 'state', 'pincode', 'phone', 'resPhone',
    'fax', 'email', 'website', 'category', 'designation',
    'specialization', 'course', 'institute', 'dob'
  ];
  return fields.reduce((count, f) => {
    const val = doc[f];
    return count + (val && String(val).trim() !== '' ? 1 : 0);
  }, 0);
}

// Normalize a doctor name for grouping
function normalizeName(name) {
  return String(name)
    .toUpperCase()
    .replace(/\s+/g, ' ')  // collapse multiple spaces
    .trim();
}

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not set in .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    if (isDryRun) {
      console.log('*** DRY RUN MODE — no records will be deleted ***\n');
    }

    console.log('Scanning all Doctor records by name...');

    // Stream all docs, only fetch fields needed
    const cursor = Doctor.find(
      {},
      {
        name: 1, clinicName: 1, address1: 1, address2: 1, address3: 1,
        district: 1, city: 1, state: 1, pincode: 1, phone: 1, resPhone: 1,
        fax: 1, email: 1, website: 1, category: 1, designation: 1,
        specialization: 1, course: 1, institute: 1, dob: 1, createdAt: 1,
      }
    ).lean().cursor();

    // Group docs by normalized name
    const nameMap = new Map();
    let totalScanned = 0;

    for await (const doc of cursor) {
      const key = normalizeName(doc.name);
      if (!nameMap.has(key)) nameMap.set(key, []);
      nameMap.get(key).push(doc);
      totalScanned++;
      if (totalScanned % 50000 === 0) {
        console.log(`  Scanned ${totalScanned.toLocaleString()} documents...`);
      }
    }

    console.log(`Finished scanning ${totalScanned.toLocaleString()} documents.`);
    console.log(`Unique normalized names: ${nameMap.size.toLocaleString()}`);

    // Find groups with duplicates
    let dupGroupCount = 0;
    const idsToDelete = [];

    for (const [, docs] of nameMap.entries()) {
      if (docs.length <= 1) continue;

      dupGroupCount++;

      // Sort: richest first, then by oldest _id as tiebreaker
      docs.sort((a, b) => {
        const richDiff = richness(b) - richness(a);
        if (richDiff !== 0) return richDiff;
        // Older ObjectId = created earlier
        return a._id.toString() < b._id.toString() ? -1 : 1;
      });

      // Keep the first (richest / oldest), delete the rest
      const toDelete = docs.slice(1).map(d => d._id);
      idsToDelete.push(...toDelete);
    }

    console.log(`\nDuplicate name groups found : ${dupGroupCount.toLocaleString()}`);
    console.log(`Records flagged for deletion: ${idsToDelete.length.toLocaleString()}`);

    if (idsToDelete.length === 0) {
      console.log('\nNo duplicates to remove. Database is clean!');
      process.exit(0);
    }

    if (isDryRun) {
      console.log('\n[DRY RUN] No deletions performed.');
      process.exit(0);
    }

    // Bulk delete in batches of 5000
    console.log('\nDeleting duplicates in batches...');
    const BATCH_SIZE = 5000;
    let totalDeleted = 0;

    for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
      const batch = idsToDelete.slice(i, i + BATCH_SIZE);
      const result = await Doctor.deleteMany({ _id: { $in: batch } });
      totalDeleted += result.deletedCount;
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(idsToDelete.length / BATCH_SIZE);
      console.log(`  Batch ${batchNum}/${totalBatches} — deleted ${result.deletedCount}`);
    }

    console.log(`\n✅ Done! Deleted ${totalDeleted.toLocaleString()} duplicate Doctor records.`);
    console.log(`   Remaining unique doctors: ${(totalScanned - totalDeleted).toLocaleString()}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
