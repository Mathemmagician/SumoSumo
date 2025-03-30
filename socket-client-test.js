import { io } from 'socket.io-client';

// Create a socket connection to your server
const socket = io('http://localhost:3001');

// Log connection events
socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
  
  // Send a test message
  socket.emit('message', 'Hello from CLI test client');
  
  // You can add more test events here
  // socket.emit('emote', '👋');
});

// Listen for various events from your game server
socket.on('gameState', (data) => {
  console.log('Received game state:', JSON.stringify(data, null, 2));
});

socket.on('playerJoined', (data) => {
  console.log('Player joined:', data);
});

socket.on('stageChange', (data) => {
  console.log('Stage changed:', data);
});

// Add more event listeners for other game events you want to test

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

// Keep the script running until manually terminated
console.log('Socket.io test client running. Press Ctrl+C to terminate.'); 