import { Logger } from 'pino';
import { prisma } from '../lib/prisma/prisma.js';
import { getTopicQuestionsSuggestions } from '@/lib/aiActions/getTopicQuestionsSuggestions.js';
import { createTopicQuestionsFromSuggestions } from './utils/createTopicQuestionsFromSuggestions.js';
import { fillQuestionAnswers } from './utils/fillQuestionAnswers.js';
import { fillQuestionTheory } from './utils/fillQuestionTheory.js';
import { markWorkerStarted, markWorkerHeartbeat, markWorkerStopped, markWorkerError } from '@/lib/workerStatus.js';

export interface Book {
  id: string;
  title_uk: string;
  title_en: string;
  description_uk: string;
  description_en: string;
  is_generating: boolean;
  topics: { id: string; title_uk: string; title_en: string; questions_count: number }[];
}

export async function fillBookWithData(book: Book, logger: Logger) {
  logger.info({ bookId: book.id }, 'Starting fill book worker');
  let bookId = book.id;
    try {
      markWorkerStarted(logger);

      for (const topic of book.topics) {
        if (topic.questions_count ===0) continue;

        logger.info({ bookId: book.id, topicId: topic.id }, 'Getting topic questions suggestions');

        const suggestions = await getTopicQuestionsSuggestions({
            topicTitleUk: topic.title_uk,
            topicTitleEn: topic.title_en,
            bookTitleUk: book.title_uk,
            bookTitleEn: book.title_en,
            bookDescriptionUk: book.description_uk,
            bookDescriptionEn: book.description_en,
            otherTopics: book.topics.filter(t => t.id !== topic.id).map(t => ({ titleUk: t.title_uk, titleEn: t.title_en })),
            existingQuestions: [],
          }, logger);

        if (!suggestions || suggestions.length === 0) {
          logger.error({ bookId: book.id, topicId: topic.id }, 'No topic questions suggestions found');
          continue;
        }

        const createdQuestions = await createTopicQuestionsFromSuggestions({
          bookId: book.id,
          topicId: topic.id,
          suggestions,
          logger
        });

        logger.info({ bookId: book.id, topicId: topic.id, questionsCount: createdQuestions.length }, 'Topic questions created');

        for (const question of createdQuestions) {
          const createdAnswers = await fillQuestionAnswers({ question, logger, book, topic });
          await fillQuestionTheory({ question, logger, answers: createdAnswers, book, topic });

          await prisma.$executeRaw`
            UPDATE questions 
            SET is_active = true, updated_at = NOW()
            WHERE id = ${question.id}
          `;

          logger.info({ bookId: book.id, topicId: topic.id, questionId: question.id }, 'Question activated');
          // heartbeat after each question to indicate liveness
          markWorkerHeartbeat(logger);
        }

      }

    } catch (error) {
      logger.error({ bookId, error }, 'Error in fill book worker');
      markWorkerError(error, logger);
    }finally {
      await prisma.book.update({
        where: { id: book.id },
        data: { is_generating: false }
      });

      logger.info({ bookId: book.id }, 'Set is_generating = false');
      markWorkerStopped(logger);
    }
}
