import { OpenAI } from 'openai';


import { Logger } from 'openai/client';

interface QuestionAnswersSuggestionsProps {
    book: {
        readonly titleUk: string;
        readonly titleEn: string;
        readonly descriptionUk: string;
        readonly descriptionEn: string;
    };
    topic: {
        readonly titleUk: string;
        readonly titleEn: string;
    };
    readonly question: {
        readonly textUk: string;
        readonly textEn: string;
    };
}

export interface QuestionAnswersSuggestion {
    readonly textUk: string;
    readonly textEn: string;
    readonly isCorrect: boolean;
}

const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY']
});

export const getQusetionAnswersSuggestions = async (data: QuestionAnswersSuggestionsProps, logger: Logger): Promise<QuestionAnswersSuggestion[] | null> => {
    try {
        const response = await client.responses.create({
            prompt: {
                id: process.env['PROMPT_ID_QUESTION_ANSWERS'] ?? '',
                ...(process.env['PROMPT_VERSION_QUESTION_ANSWERS'] ? { version: process.env['PROMPT_VERSION_QUESTION_ANSWERS'] } : {})
            },
            input: JSON.stringify(data)
        });

        if (!response.output_text) return null;

        const suggestion = JSON.parse(response.output_text);

        if (!suggestion.answers || !Array.isArray(suggestion.answers) || suggestion.answers.length === 0) return null;

        const result = (suggestion.answers as { textUk?: string; textEn?: string; isCorrect?: boolean }[]).reduce<QuestionAnswersSuggestion[]>((acc, answer) => {
            if (answer.textUk && answer.textEn && Object.hasOwn(answer, 'isCorrect')) {
                acc.push({
                    textUk: answer.textUk,
                    textEn: answer.textEn,
                    isCorrect: !!answer.isCorrect
                });
            }
            return acc;
        }, []);

        if (result.length === 0) return null;

        return result;
    } catch (error) {
        logger.error('Error in getQusetionAnswersSuggestions',{ error } );
        return null;
    }
};
