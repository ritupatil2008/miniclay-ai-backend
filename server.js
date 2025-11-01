require('dotenv').config({ path: './config.env' });
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));               // serves index.html

const SDK_KEY    = process.env.ZOOM_SDK_KEY;
const SDK_SECRET = process.env.ZOOM_SDK_SECRET;

// Validate SDK credentials on startup
if (!SDK_KEY || !SDK_SECRET) {
  console.error('\n❌ ERROR: Missing Zoom Video SDK credentials!\n');
  console.error('Please add to config.env:');
  console.error('ZOOM_SDK_KEY=your_sdk_key_here');
  console.error('ZOOM_SDK_SECRET=your_sdk_secret_here');
  console.error('\nGet them from: https://marketplace.zoom.us → Build App → Video SDK\n');
  process.exit(1);
}

app.post('/token', (req, res) => {
  const { meetingId, password = '' } = req.body;

  if (!meetingId) return res.status(400).json({ error: 'meetingId required' });

  const payload = {
    app_key: SDK_KEY,
    mn: meetingId,
    role: 0,                                 // participant
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7200,
    tokenExp: Math.floor(Date.now() / 1000) + 7200
  };

  if (!SDK_KEY || !SDK_SECRET) {
    return res.status(500).json({ 
      error: 'Server misconfiguration: Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET in config.env' 
    });
  }

  try {
    const signature = jwt.sign(payload, SDK_SECRET);
    res.json({ sdkKey: SDK_KEY, signature, password, meetingId });
  } catch (e) {
    console.error('Token generation error:', e.message);
    res.status(500).json({ 
      error: `Token error: ${e.message}. Check your SDK_SECRET in config.env` 
    });
  }
});

// Function to find an available port
function findAvailablePort(startPort = 3000) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// Start server on available port
findAvailablePort().then(PORT => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Trying another port...`);
    } else {
      console.error('Server error:', err);
    }
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});