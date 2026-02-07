const mongoose = require('mongoose');
require('dotenv').config();

const fixIndex = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medico';
        console.log('Connecting to:', uri.replace(/\/\/.*@/, '//***@')); // Mask credentials

        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        // List indexes
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes);

        // Drop email index if it exists
        const emailIndex = indexes.find(idx => idx.key.email);
        if (emailIndex) {
            console.log(`Dropping index: ${emailIndex.name}`);
            await collection.dropIndex(emailIndex.name);
            console.log('Index dropped successfully');
        } else {
            console.log('Email index not found');
        }

        console.log('Done. Mongoose will recreate the index with sparse: true on next startup/save.');
        process.exit(0);
    } catch (err) {
        console.error('Error details:', err);
        process.exit(1);
    }
};

fixIndex();
