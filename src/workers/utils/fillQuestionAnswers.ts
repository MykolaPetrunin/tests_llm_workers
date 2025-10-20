import { Logger } from "openai/client";
import { CreatedQuestion } from "./createTopicQuestionsFromSuggestions.js";
import { getQusetionAnswersSuggestions, QuestionAnswersSuggestion } from "@/lib/aiActions/getQusetionAnswersSuggestions.js";
import { bulkInsertAnswers, CreatedAnswer } from "./bulkInsertAnswers.js";

interface FillQuestionAnswersProps {
  readonly question: CreatedQuestion;
  readonly logger: Logger;
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

export async function fillQuestionAnswers({ question, logger, book, topic }:FillQuestionAnswersProps): Promise<CreatedAnswer[]> {
  try {
    const answersSuggestions = await getQusetionAnswersSuggestions({
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
        },
    }, logger);

    if (!answersSuggestions || answersSuggestions.length === 0) {
      logger.error('No answers suggestions found',{ questionId: question.id } );
      return [];
    }


    const createdAnswers = await bulkInsertAnswers(question.id, answersSuggestions, logger);

    logger.info('Successfully filled question with answers', { questionId: question.id });
    return createdAnswers;
  } catch (error) {
    logger.error('Error in fillQuestionWorker', { error, questionId: question.id });
    throw error;
  }
}
