/**
 * Admin Seeding Script
 * Usage: node scripts/seedAdmin.js
 * 
 * This script creates a default Super Admin user if one does not already exist.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables BEFORE importing application code
// This is critical because env.js validates variables on import
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env from root directory (one level up from scripts/)
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (result.error) {
    console.warn('⚠️  Could not find .env file in parent directory. Trying default location...');
    dotenv.config(); // Fallback to default
}

// Dynamic imports to ensure env vars are loaded first
const { connectAllDatabases } = await import('../src/shared/infrastructure/database/connections.js');
const { default: User } = await import('../src/domains/flowers/auth/models/User.model.js');

const seedAdmin = async () => {
    try {
        // 1. Connect to Database
        console.log('🌱 Starting Admin Seeding Process...');
        await connectAllDatabases();

        // 2. Check for existing Admin
        console.log('🔍 Checking for existing admin users...');

        // We need to ensure the User model is using the correct connection
        // The model proxy handles this, but we need the connection to be ready
        const adminExists = await User.findOne({ role: 'ADMIN' });

        if (adminExists) {
            console.log('⚠️  Admin user already exists.');
            console.log(`   Email: ${adminExists.email}`);
            console.log('   Action: Seeding skipped.');
            process.exit(0);
        }

        // 3. Create New Admin
        console.log('✨ No admin found. Creating new Super Admin...');

        // Get creds from env or use defaults
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@floweremporium.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

        const adminData = {
            name: 'Super Admin',
            email: adminEmail,
            password: adminPassword,
            role: 'ADMIN',
            companyName: 'Flower Emporium', // Not strictly required for Admin but good to have
            isVerified: true
        };

        const newAdmin = await User.create(adminData);

        console.log('\n✅ SUPER ADMIN CREATED SUCCESSFULLY!');
        console.log('-----------------------------------');
        console.log(`User ID:  ${newAdmin._id}`);
        console.log(`Email:    ${newAdmin.email}`);
        console.log(`Password: ${adminPassword}`);
        console.log(`Role:     ${newAdmin.role}`);
        console.log('-----------------------------------');
        console.log('⚠️  IMPORTANT: Change this password immediately after logging in!');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ SEEDING FAILED:', error);
        process.exit(1);
    }
};

// Execute
seedAdmin();
