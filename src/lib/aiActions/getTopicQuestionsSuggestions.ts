'use server';

import OpenAI from 'openai';
import { Logger } from 'pino';

interface TopicQuestionsSuggestionsProps {
    readonly topicTitleEn: string;
    readonly topicTitleUk: string;
    readonly bookTitleEn: string;
    readonly bookTitleUk: string;
    readonly bookDescriptionEn: string;
    readonly bookDescriptionUk: string;
    readonly otherTopics: {
        readonly titleEn: string;
        readonly titleUk: string;
    }[];
    readonly existingQuestions: {
        readonly textEn: string;
        readonly textUk: string;
    }[];
}

export interface TopicQuestionSuggestion {
    readonly textUk: string;
    readonly textEn: string;
    readonly optional: boolean;
    readonly level: 'junior' | 'middle' | 'senior';
}

const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY']
});

export const getTopicQuestionsSuggestions = async (data: TopicQuestionsSuggestionsProps,logger: Logger): Promise<TopicQuestionSuggestion[] | null> => {
    try {
        const response = await client.responses.create({
            prompt: {
                id: process.env['PROMPT_ID_TOPIC_QUESTIONS'] ?? '',
                ...(process.env['PROMPT_VERSION_TOPIC_QUESTIONS'] ? { version: process.env['PROMPT_VERSION_TOPIC_QUESTIONS'] } : {})
            },
            input: JSON.stringify(data)
        });

        if (!response.output_text) {
            return null;
        }

        const suggestion = JSON.parse(response.output_text);

        if (!suggestion.newQuestions || !Array.isArray(suggestion.newQuestions) || suggestion.newQuestions.length === 0) return null;

        const result = (
            suggestion.newQuestions as {
                textUk?: string;
                textEn?: string;
                level?: 'junior' | 'middle' | 'senior';
                optional?: boolean;
            }[]
        ).reduce<TopicQuestionSuggestion[]>((acc, question) => {
            if (question.textUk && question.textEn && question.level && Object.hasOwn(question, 'optional')) {
                acc.push({
                    textUk: question.textUk,
                    textEn: question.textEn,
                    optional: !!question.optional,
                    level: question.level
                });
            }
            return acc;
        }, []);

        if (result.length === 0) {
            return null;
        }

        return result;
    } catch (error) {
        logger.error({ error }, 'Error in getTopicQuestionsSuggestions');
        return null;
    }
};
