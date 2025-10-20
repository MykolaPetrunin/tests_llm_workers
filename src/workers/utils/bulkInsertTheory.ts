import { QuestionTheorySuggestion } from "@/lib/aiActions/getQuestionTheorySuggestions.js";
import prisma from "@/lib/prisma/prisma.js";
import { Logger } from "openai/client";

export interface UpdatedQuestion {
  id: string;
  theoryUk: string;
  theoryEn: string;
  isActive: boolean;
  updatedAt: Date;
}

export interface UpdatedAnswer {
  id: string;
  questionId: string;
  theoryUk: string;
  theoryEn: string;
  updatedAt: Date;
}

export async function bulkInsertTheory(
  questionId: string,
  theorySuggestions: QuestionTheorySuggestion,
  answers: Array<{ id: string; questionId: string }>,
  logger: Logger
): Promise<{ question: UpdatedQuestion; answers: UpdatedAnswer[] }> {
  try {
    // Оновлюємо теорію питання
    const updateQuestionQuery = `
      UPDATE questions 
      SET theory_uk = $1, theory_en = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, theory_uk, theory_en, is_active, updated_at
    `;

    const questionResult = await prisma.$queryRawUnsafe(
      updateQuestionQuery,
      theorySuggestions.theoryUk,
      theorySuggestions.theoryEn,
      questionId
    ) as Array<{
      id: string;
      theory_uk: string;
      theory_en: string;
      is_active: boolean;
      updated_at: Date;
    }>;

    if (questionResult.length === 0) {
      throw new Error(`Question with id ${questionId} not found`);
    }

    const updatedQuestion = questionResult[0];

    // Оновлюємо теорію для відповідей
    const answerUpdates = theorySuggestions.answers.map((answerTheory, index) => {
      const answerId = answers[index]?.id;
      if (!answerId) {
        throw new Error(`Answer at index ${index} not found`);
      }
      return {
        answerId,
        theoryUk: answerTheory.theoryUk,
        theoryEn: answerTheory.theoryEn
      };
    });

    // Створюємо bulk update для відповідей
    const answerValues = answerUpdates.map((update, index) => {
      const paramIndex = index * 3 + 1;
      return `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, NOW())`;
    }).join(', ');

    const answerParams = answerUpdates.flatMap(update => [
      update.theoryUk,
      update.theoryEn,
      update.answerId
    ]);

    const updateAnswersQuery = `
      UPDATE answers 
      SET theory_uk = update_data.theory_uk, 
          theory_en = update_data.theory_en, 
          updated_at = update_data.updated_at
      FROM (VALUES ${answerValues}) AS update_data(theory_uk, theory_en, id, updated_at)
      WHERE answers.id = update_data.id::text
      RETURNING answers.id, answers.question_id, answers.theory_uk, answers.theory_en, answers.updated_at
    `;

    const answersResult = await prisma.$queryRawUnsafe(
      updateAnswersQuery,
      ...answerParams
    ) as Array<{
      id: string;
      question_id: string;
      theory_uk: string;
      theory_en: string;
      updated_at: Date;
    }>;

    logger.info('Successfully updated question and answers theory', {
      questionId,
      answersCount: answersResult.length
    });

    return {
      question: {
        id: updatedQuestion.id,
        theoryUk: updatedQuestion.theory_uk,
        theoryEn: updatedQuestion.theory_en,
        isActive: updatedQuestion.is_active,
        updatedAt: updatedQuestion.updated_at
      },
      answers: answersResult.map(row => ({
        id: row.id,
        questionId: row.question_id,
        theoryUk: row.theory_uk,
        theoryEn: row.theory_en,
        updatedAt: row.updated_at
      }))
    };
  } catch (error) {
    logger.error('Error in bulkInsertTheory', { error, questionId });
    throw error;
  }
}
