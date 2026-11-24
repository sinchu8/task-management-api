const app = require('./app');
const env = require('./config/env');
const db = require('./config/database');

const server = app.listen(env.port, () => {
  console.log(`Task Management API running in ${env.nodeEnv} mode on http://localhost:${env.port}`);
});

// Close the HTTP server and the database cleanly on Ctrl+C / container stop.
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
