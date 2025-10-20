import { QuestionAnswersSuggestion } from "@/lib/aiActions/getQusetionAnswersSuggestions";
import prisma from "@/lib/prisma/prisma";
import { Logger } from "openai/client";

export interface CreatedAnswer {
  id: string;
  questionId: string;
  textUk: string;
  textEn: string;
  isCorrect: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function bulkInsertAnswers(
    questionId: string, 
    answersSuggestions: QuestionAnswersSuggestion[], 
    logger: Logger
  ): Promise<CreatedAnswer[]> {
    try {
  
      const values = answersSuggestions.map((answer, index) => {
        const firstParamIndex = index * 4 + 2;
        return `(gen_random_uuid()::text, $1, $${firstParamIndex}, $${firstParamIndex + 1}, $${firstParamIndex + 2}, $${firstParamIndex + 3}, NOW(), NOW(), '', '')`;
      }).join(', ');
  
  
      const params = [
        questionId,
        ...answersSuggestions.flatMap((answer, index) => [
          answer.textUk,
          answer.textEn,
          answer.isCorrect,
          index + 1
        ])
      ];
  
      const insertAnswersQuery = `
        INSERT INTO answers (
          id, question_id, text_uk, text_en, is_correct, 
          order_index, created_at, updated_at, theory_uk, theory_en
        )
        VALUES ${values}
        RETURNING id, question_id, text_uk, text_en, is_correct, order_index, created_at, updated_at
      `;

      const result = await prisma.$queryRawUnsafe(insertAnswersQuery, ...params) as Array<{
        id: string;
        question_id: string;
        text_uk: string;
        text_en: string;
        is_correct: boolean;
        order_index: number;
        created_at: Date;
        updated_at: Date;
      }>;
      
      logger.info('Successfully inserted answers', { 
        questionId, 
        answersCount: answersSuggestions.length 
      });

      // Transform the result to match the return type
      return result.map(row => ({
        id: row.id,
        questionId: row.question_id,
        textUk: row.text_uk,
        textEn: row.text_en,
        isCorrect: row.is_correct,
        orderIndex: row.order_index,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error('Error in bulkInsertAnswers', { error, questionId });
      throw error;
    }
  }