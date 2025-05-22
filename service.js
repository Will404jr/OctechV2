const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'QMS', // Service name
  description: 'My Next.js application running as a Windows Service',
  script: path.join(__dirname, 'node_modules', '.bin', 'next'), // Path to next binary
  scriptOptions: 'start', // Command to start the Next.js app
  workingDirectory: __dirname, // Project directory
  env: {
    name: 'NODE_ENV',
    value: 'production' // Set environment to production
  }
});

// Listen for the "install" event, which indicates the service is installed
svc.on('install', () => {
  svc.start();
  console.log('Service installed and started!');
});

// Listen for the "uninstall" event
svc.on('uninstall', () => {
  console.log('Service uninstalled');
});

// Install the service
svc.install();