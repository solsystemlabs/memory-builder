import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from './lib/prisma.js';
import * as fs from 'node:fs';

const fastify = Fastify({
  logger: true
});

await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://your-production-domain.com'
    : 'http://localhost:5173'
});

fastify.post('/load', async (request, reply) => {
  try {
    const filePath = '/mnt/c/Users/foxmc/IdeaProjects/memory-builder/server/assets/bsbible.txt';

    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');

    const verses = lines.map(line => {
      const sanitizedLine = line.replace('\r', '');
      const match = sanitizedLine.match(/^(\w+)\s(\d+):(\d+)\t(.+)$/);
      console.log(match);
      if (!match) {
        return null;
      }

      return {
        book: match[1],
        chapter: parseInt(match[2], 10),
        verse: parseInt(match[3], 10),
        text: match[4]
      };
    }).filter(v => v !== null);

    await prisma.verse.createMany({ data: verses });
    console.log('Verses successfully inserted into MongoDB.');
    reply.send({ message: 'Verses successfully inserted into MongoDB.' });
  } catch (error) {
    console.error('Error processing file:', error);
  }
});

// Example CRUD routes
fastify.post('/api/users', async (request, reply) => {
  const { email, name } = request.body as {email: string; name: string};

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
      },
    });
    return user;
  } catch (error) {
    reply.status(400).send({ error: 'Failed to create user', errorObj: error });
  }
});

fastify.get('/api/users/:id', async (request, reply) => {
  const { id } = request.params as {id: string};

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { memories: true },
    });

    if (!user) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }

    return user;
  } catch (error) {
    reply.status(400).send({ error: 'Failed to fetch user' });
  }
});

fastify.post('/api/memories', async (request, reply) => {
  const { title, description, userId } = request.body as {
    title: string;
    description: string;
    userId: string;
  };

  try {
    const memory = await prisma.memory.create({
      data: {
        title,
        description,
        userId,
      },
    });
    return memory;
  } catch (error) {
    reply.status(400).send({ error: 'Failed to create memory' });
  }
});

// Graceful shutdown
const gracefulShutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

try {
  await fastify.listen({ port: 3000, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
