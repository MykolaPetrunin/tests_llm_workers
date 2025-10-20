import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { fillBookWithData } from '../workers/fillBookWorker.js';
import prisma from '@/lib/prisma/prisma.js';

const StartFillingTopicsSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
});

export async function topicsRoutes(fastify: FastifyInstance) {
  fastify.post('/start-filling-topics-with-data', {
    schema: {
      body: {
        type: 'object',
        required: ['bookId'],
        properties: {
          bookId: { 
            type: 'string',
            minLength: 1
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            bookId: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: z.infer<typeof StartFillingTopicsSchema> }>, reply: FastifyReply) => {
    try {
      // Додаткова валідація з Zod
      const validatedBody = StartFillingTopicsSchema.parse(request.body);
      const { bookId } = validatedBody;
      
      fastify.log.info({ bookId }, 'Received request to start filling topics with data');

      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: {
          id: true,
          title_uk: true,
          title_en: true,
          description_uk: true,
          description_en: true,
          is_generating: true,
          topics: {
            select: {
              id: true,
              title_uk: true,
              title_en: true
            }
          }
        }
      });
  
      if (!book) {
        fastify.log.error({ bookId }, 'Book not found');
        return;
      }

      fastify.log.info({ 
        bookId, 
        bookTitle: book.title_en
      }, 'Book found, starting processing');
  
  
      await prisma.book.update({
        where: { id: bookId },
        data: { is_generating: true }
      });


      fastify.log.info({ bookId }, 'Set is_generating = true');
      
      
      fillBookWithData(book as any, fastify.log as any).catch(error => {
        fastify.log.error({ bookId, error }, 'Worker failed');
      });
      
      fastify.log.info({ bookId }, 'Worker started asynchronously');
      
      return reply.status(200).send({
        success: true,
        message: 'Topics filling process started successfully',
        bookId
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error in start-filling-topics-with-data endpoint');
      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  });
}
