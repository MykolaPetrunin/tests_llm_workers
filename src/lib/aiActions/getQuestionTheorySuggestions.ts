import { OpenAI } from 'openai';
import { Logger } from 'openai/client';

const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY']
});

interface QuestionTheorySuggestionsProps {
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
        readonly answers: {
            readonly id: string;
            readonly textUk: string;
            readonly textEn: string;
            readonly isCorrect: boolean;
        }[];
    };
}

export interface QuestionTheorySuggestion {
    readonly theoryUk: string;
    readonly theoryEn: string;
    readonly answers: readonly {
        readonly theoryUk: string;
        readonly theoryEn: string;
    }[];
}

export const getQuestionTheorySuggestions = async (data: QuestionTheorySuggestionsProps, logger: Logger): Promise<QuestionTheorySuggestion | null> => {
    try {
        const response = await client.responses.create({
            prompt: {
                id: process.env['PROMPT_ID_QUESTION_THEORY'] ?? '',
                ...(process.env['PROMPT_VERSION_QUESTION_THEORY'] ? { version: process.env['PROMPT_VERSION_QUESTION_THEORY'] } : {})
            },
            input: JSON.stringify(data)
        });

        if (!response.output_text) return null;

        const suggestion = JSON.parse(response.output_text);

        if (
            !suggestion.theoryUk ||
            !suggestion.theoryEn ||
            !suggestion.answers ||
            !Array.isArray(suggestion.answers) ||
            suggestion.answers.length !== data.question.answers.length
        ) {
            logger.error('Invalid suggestion length',{ error: new Error('Invalid suggestion length') } );
            return null;
        }

        const answers = (suggestion.answers as { theoryUk: string; theoryEn: string }[]).reduce<{ theoryUk: string; theoryEn: string }[]>((acc, answer) => {
            if (!answer || !answer.theoryUk || !answer.theoryEn) return acc;
            return [...acc, { theoryUk: answer.theoryUk, theoryEn: answer.theoryEn }];
        }, []);

        if (answers.length !== data.question.answers.length) {
            logger.error('Invalid suggestion length',{ error: new Error('Invalid suggestion length') } );
            return null;
        }

        return {
            theoryUk: suggestion.theoryUk,
            theoryEn: suggestion.theoryEn,
            answers
        };
    } catch (error) {
        logger.error('Error in getQuestionTheorySuggestions',{ error } );
        return null;
    }
};
