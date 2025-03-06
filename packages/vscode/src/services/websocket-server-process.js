const WebSocket = require('ws');
const http = require('http');
const process = require('process');

const PORT = 55155;
const SECURITY_TOKEN = 'gemini-coder';

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  
  res.writeHead(404);
  res.end();
});

// Create WebSocket server
const wss = new WebSocket.WebSocketServer({ server });
const connections = new Set();

// Log server start information
console.log(`Starting WebSocket server process (PID: ${process.pid})`);

// Handle WebSocket connections
wss.on('connection', (ws, request) => {
  // Verify security token
  const url = new URL(request.url || '', `http://localhost:${PORT}`);
  const token = url.searchParams.get('token');

  if (token !== SECURITY_TOKEN) {
    ws.close(1008, 'Invalid security token');
    return;
  }

  console.log('New client connected');
  connections.add(ws);

  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const msgString = message.toString();
      
      // Handle ping message specially
      if (msgString === 'ping') {
        // Just keep the connection alive, no response needed
        return;
      }
      
      const msgData = JSON.parse(msgString);
      
      // Broadcast message to all other clients if it's an initialize-chats action
      if (msgData.action === 'initialize-chats') {
        connections.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(msgString);
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    connections.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connections.delete(ws);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  shutdown();
});

process.on('SIGTERM', () => {
  shutdown();
});

function shutdown() {
  console.log('Shutting down WebSocket server...');
  
  // Close all connections
  connections.forEach((ws) => {
    ws.close();
  });
  connections.clear();
  
  // Close server
  wss.close();
  server.close(() => {
    console.log('WebSocket server stopped');
    process.exit(0);
  });
}