import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

let io: SocketServer;

/**
 * Initialize Socket.io server with authentication and event handlers.
 */
export function initializeSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: true, // Allow all origins for dev & ngrok tunneling
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow unauthenticated connections for public dashboards
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    console.log(`🔌 Socket connected: ${socket.id}${userId ? ` (user: ${userId})` : ''}`);

    // Join user-specific room for targeted notifications
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join role-based rooms
    if (socket.data.user?.role === 'admin') {
      socket.join('admins');
    }

    // Handle dashboard subscription
    socket.on('subscribe:dashboard', () => {
      socket.join('dashboard');
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log('🔌 Socket.io initialized');
  return io;
}

/**
 * Get the Socket.io server instance.
 */
export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

/**
 * Emit events for real-time dashboard updates.
 */
export const socketEvents = {
  /** Broadcast when an item is borrowed */
  itemBorrowed(data: { itemId: string; itemName: string; userName: string }) {
    if (io) {
      io.to('dashboard').emit('item:borrowed', data);
      io.to('dashboard').emit('dashboard:refresh', { type: 'borrow' });
    }
  },

  /** Broadcast when an item is returned */
  itemReturned(data: { itemId: string; itemName: string; userName: string }) {
    if (io) {
      io.to('dashboard').emit('item:returned', data);
      io.to('dashboard').emit('dashboard:refresh', { type: 'return' });
    }
  },

  /** Broadcast when an item is updated */
  itemUpdated(data: { itemId: string; changes: Record<string, any> }) {
    if (io) {
      io.to('dashboard').emit('item:updated', data);
      io.to('dashboard').emit('dashboard:refresh', { type: 'update' });
    }
  },

  /** Send notification to a specific user */
  notifyUser(userId: string, notification: { title: string; message: string; type: string }) {
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification);
    }
  },
};
