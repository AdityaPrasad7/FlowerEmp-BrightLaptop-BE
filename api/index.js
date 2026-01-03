/**
 * Vercel Serverless Function Handler
 * Exports Express app as a serverless function for Vercel
 */
import app from '../src/app.js';
import { connectAllDatabases } from '../src/shared/infrastructure/database/connections.js';

// Track if databases are already connected (for serverless cold starts)
let databasesConnected = false;

/**
 * Initialize databases on cold start
 * This will be cached between function invocations
 */
const initializeDatabases = async () => {
  if (!databasesConnected) {
    try {
      await connectAllDatabases();
      databasesConnected = true;
      console.log('✅ Databases initialized for serverless function');
    } catch (error) {
      console.error('❌ Failed to initialize databases:', error);
      // Don't throw - allow function to handle requests even if DB init fails
      // Individual routes will handle database errors
    }
  }
};

// Initialize databases on module load (cached between invocations)
initializeDatabases().catch(console.error);

/**
 * Vercel serverless function handler
 * @param {Object} req - Vercel request object
 * @param {Object} res - Vercel response object
 */
export default async function handler(req, res) {
  try {
    // Ensure databases are connected (handles cold starts)
    if (!databasesConnected) {
      await initializeDatabases();
    }

    // Return the Express app handler
    return app(req, res);
  } catch (error) {
    console.error('❌ Serverless function error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

