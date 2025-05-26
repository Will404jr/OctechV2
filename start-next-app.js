const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to your Next.js project directory (update this to your project's path)
const projectDir = 'C:\\path\\to\\your\\nextjs-app';

// Path for log file
const logFile = path.join(projectDir, 'startup-log.txt');

// Function to log messages to file and console
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage);
}

// Function to execute shell commands
function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        log(`Error executing ${command}: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        log(`Stderr from ${command}: ${stderr}`);
      }
      log(`Stdout from ${command}: ${stdout}`);
      resolve();
    });
  });
}

// Main function to build and start the Next.js app
async function main() {
  try {
    log('Starting Next.js build process...');
    await runCommand('npm run build', projectDir);
    log('Build completed successfully.');

    log('Starting Next.js app...');
    await runCommand('npm start', projectDir);
    log('Next.js app started successfully.');
  } catch (error) {
    log('Failed to complete startup process.');
    process.exit(1);
  }
}

main();