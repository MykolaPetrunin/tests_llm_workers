import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { prisma } from './lib/prisma/prisma.js';
import { topicsRoutes } from './routes/topics.js';
import { getWorkerHealth } from './lib/workerStatus.js';

// Load environment variables
config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' 
      ? { target: 'pino-pretty' }
      : undefined
  }
});

// Register CORS
await fastify.register(cors, {
  origin: true,
  credentials: true
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    const worker = getWorkerHealth();
    
    return reply.status(200).send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      worker
    });
  } catch (error) {
    fastify.log.error({ error }, 'Health check failed');
    return reply.status(503).send({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      worker: getWorkerHealth()
    });
  }
});

// Register routes
await fastify.register(topicsRoutes, { prefix: '/api' });

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info({ signal }, 'Received shutdown signal');
  
  try {
    await fastify.close();
    await prisma.$disconnect();
    fastify.log.info('Server closed gracefully');
    process.exit(0);
  } catch (error) {
    fastify.log.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info({ port, host }, 'Server started successfully');
  } catch (error) {
    fastify.log.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

start();
