import { Logger } from "openai/client";
import { CreatedQuestion } from "./createTopicQuestionsFromSuggestions";
import { CreatedAnswer } from "./bulkInsertAnswers";
import { getQuestionTheorySuggestions } from "@/lib/aiActions/getQuestionTheorySuggestions";
import { bulkInsertTheory } from "./bulkInsertTheory";
import prisma from "@/lib/prisma/prisma";

interface FillQuestionTheoryProps {
  readonly question: CreatedQuestion;
  readonly logger: Logger;
  readonly answers: CreatedAnswer[];
  book: {
    id: string;
    title_uk: string;
    title_en: string;
    description_uk: string;
    description_en: string;
  };
  topic: {
    id: string;
    title_uk: string;
    title_en: string;
  };
}

export async function fillQuestionTheory({ question, logger, answers, book, topic }: FillQuestionTheoryProps) {
  try {
    const theorySuggestions = await getQuestionTheorySuggestions({
      book: {
        titleUk: book.title_uk,
        titleEn: book.title_en,
        descriptionUk: book.description_uk,
        descriptionEn: book.description_en,
      },
      topic: {
        titleUk: topic.title_uk,
        titleEn: topic.title_en,
      },
      question: {
        textUk: question.textUk,
        textEn: question.textEn,
        answers: answers.map(answer => ({
          id: answer.id,
          textUk: answer.textUk,
          textEn: answer.textEn,
          isCorrect: answer.isCorrect,
        })),
      },
    }, logger);

    if (!theorySuggestions) {
      logger.error('No theory suggestions found',{ questionId: question.id } );
      return;
    }

    const updatedTheory = await bulkInsertTheory(
      question.id,
      theorySuggestions,
      answers.map(answer => ({ id: answer.id, questionId: answer.questionId })),
      logger
    );

    logger.info('Successfully filled question theory', {
      questionId: question.id,
      theoryLength: theorySuggestions.theoryUk.length,
      answersCount: updatedTheory.answers.length
    });

    logger.info('Successfully updated question theory', {
      questionId: question.id
    });

  } catch (error) {
    logger.error('Error in fillQuestionTheory', { error, questionId: question.id });
    throw error;
  }
}