
const express = require('express');
const path = require('path');
const fs = require('fs');

const buildPath = fs.existsSync('./build') ? './build' : '../build';


const app = express();
const port = process.env.PORT || 3000;


app.use((req, res, next) => {
  if (req.path === '/index.html' || req.path === '/') {
    fs.readFile(path.join(__dirname, buildPath, 'index.html'), 'utf8', (err, data) => {
      if (err) {
        return next(err);
      }
      
      
      const helperScriptPath = path.join(__dirname, 'fix-indexeddb.js');
      if (fs.existsSync(helperScriptPath)) {
        
        const helperScript = fs.readFileSync(helperScriptPath, 'utf8');
        
        
        const modifiedHtml = data.replace(
          '</head>',
          `<script>${helperScript}</script></head>`
        );
        
        res.send(modifiedHtml);
      } else {
        
        res.send(data);
      }
    });
  } else {
    next();
  }
});


app.use(express.static(path.join(__dirname, buildPath)));


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, buildPath, 'index.html'));
});


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