import mongoose from 'mongoose';
import { DatabaseError } from '../errors/AppError';

const CONNECTION_OPTIONS: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

async function connect(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new DatabaseError('MONGODB_URI environment variable is not set');
  }

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  await mongoose.connect(uri, CONNECTION_OPTIONS);
}

async function disconnect(): Promise<void> {
  await mongoose.disconnect();
  console.log('MongoDB disconnected gracefully');
}

function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function getConnectionState(): string {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] ?? 'unknown';
}

export const database = { connect, disconnect, isConnected, getConnectionState };
