/**
 * Server Entry Point
 * Initializes database connection and starts the Express server
 */
import app from './src/app.js';
import { connectAllDatabases } from './src/shared/infrastructure/database/connections.js';
import { seedAdminOnStartup } from './src/shared/utils/seedAdmin.js';
import env from './src/shared/infrastructure/config/env.js';

// Connect to databases (domain-specific: flowers database includes users)
connectAllDatabases().then(() => {
  // Auto-seed admin user after database connection
  seedAdminOnStartup();
});

// Start server
const PORT = env.port || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${env.nodeEnv} mode on port ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📋 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

// Initialize Socket.io
import { initSocket } from './src/shared/common/utils/socketService.js';
initSocket(server);

// Initialize Schedulers
import { startAbandonedCartScheduler } from './src/shared/common/schedulers/abandonedCartScheduler.js';
startAbandonedCartScheduler();

// INCREASE TIMEOUT for slow uploads (5 minutes)
server.timeout = 300000;
server.keepAliveTimeout = 300000;
server.headersTimeout = 301000;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

