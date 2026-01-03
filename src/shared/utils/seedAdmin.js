/**
 * Auto-seed Admin User
 * Automatically creates admin user on server startup if it doesn't exist
 * Also ensures password is set correctly if user exists
 */

import User from '../../domains/laptops/auth/models/User.model.js';

const ADMIN_DATA = {
  name: 'Super Admin',
  email: 'admin@brightlaptop.com',
  password: 'admin123',
  role: 'ADMIN',
  isVerified: true,
};

/**
 * Seed admin user if it doesn't exist
 * Also updates password if user exists (to ensure it's always set correctly)
 * Called automatically on server startup
 */
export const seedAdminOnStartup = async () => {
  try {
    // Wait a bit for database connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if admin already exists - need to select password to update it
    const existingAdmin = await User.findOne({ email: ADMIN_DATA.email }).select('+password');
    
    if (existingAdmin) {
      // Delete and recreate to ensure password is properly hashed
      // This is more reliable than trying to update the password
      console.log('🔄 Admin user exists, recreating to ensure password is correct...');
      await User.deleteOne({ email: ADMIN_DATA.email });
      
      // Create fresh admin user (password will be hashed by pre-save hook)
      const admin = await User.create(ADMIN_DATA);
      
      // Verify the password was saved correctly
      const verifyAdmin = await User.findOne({ email: ADMIN_DATA.email }).select('+password');
      const passwordMatch = await verifyAdmin.comparePassword(ADMIN_DATA.password);
      
      if (passwordMatch) {
        console.log('✅ Admin user recreated:', ADMIN_DATA.email);
        console.log('   💡 Password set to:', ADMIN_DATA.password);
        console.log('   ✅ Password verified successfully');
      } else {
        console.error('⚠️  Password verification failed after recreation');
      }
      
      return { success: true, message: 'Admin user recreated', user: admin };
    }
    
    // Create new admin user
    const admin = await User.create(ADMIN_DATA);
    
    // Verify the password
    const verifyAdmin = await User.findOne({ email: ADMIN_DATA.email }).select('+password');
    const passwordMatch = await verifyAdmin.comparePassword(ADMIN_DATA.password);
    
    if (passwordMatch) {
      console.log('🌱 Admin user auto-seeded successfully!');
      console.log('   📧 Email:', admin.email);
      console.log('   👤 Name:', admin.name);
      console.log('   🔑 Role:', admin.role);
      console.log('   💡 Password:', ADMIN_DATA.password);
      console.log('   ✅ Password verified successfully');
    } else {
      console.error('⚠️  Password verification failed after creation');
    }
    
    return { success: true, message: 'Admin user created', user: admin };
  } catch (error) {
    console.error('⚠️  Failed to auto-seed admin user:', error.message);
    console.error('   Full error:', error);
    // Don't throw - allow server to start even if seeding fails
    return { success: false, error: error.message };
  }
};

