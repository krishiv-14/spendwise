/**
 * Simple Express server to run the React app
 * This bypasses PowerShell execution policy issues
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

// Check if we're running from node_modules or standalone
const buildPath = fs.existsSync('./build') ? './build' : '../build';

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Inject our IndexedDB helper script for database recovery
app.use((req, res, next) => {
  if (req.path === '/index.html' || req.path === '/') {
    fs.readFile(path.join(__dirname, buildPath, 'index.html'), 'utf8', (err, data) => {
      if (err) {
        return next(err);
      }
      
      // Check if fix-indexeddb.js exists
      const helperScriptPath = path.join(__dirname, 'fix-indexeddb.js');
      if (fs.existsSync(helperScriptPath)) {
        // Read the helper script
        const helperScript = fs.readFileSync(helperScriptPath, 'utf8');
        
        // Inject it into index.html
        const modifiedHtml = data.replace(
          '</head>',
          `<script>${helperScript}</script></head>`
        );
        
        res.send(modifiedHtml);
      } else {
        // If helper script doesn't exist, serve original file
        res.send(data);
      }
    });
  } else {
    next();
  }
});

// Serve static files from build folder
app.use(express.static(path.join(__dirname, buildPath)));

// Handle React routing - always serve index.html for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, buildPath, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`
  ┌──────────────────────────────────────────────────┐
  │                                                  │
  │   🚀 SpendWise app running at:                   │
  │                                                  │
  │   📱 http://localhost:${port}                      │
  │                                                  │
  │   Database recovery is enabled automatically     │
  │   Press Ctrl+C to stop the server               │
  │                                                  │
  └──────────────────────────────────────────────────┘
  `);
}); 