import { TopicQuestionSuggestion } from "@/lib/aiActions/getTopicQuestionsSuggestions";
import prisma from "@/lib/prisma/prisma";
import { Logger } from "openai/client";
import { Prisma } from "@prisma/client";
const levelKeyValues = ['junior', 'middle', 'senior'] as const;

export type LevelKey = (typeof levelKeyValues)[number];

export interface CreatedQuestion {
    readonly id: string;
    readonly textUk: string;
    readonly textEn: string;
    readonly level: LevelKey;
    readonly bookId: string;
    readonly topicId: string;
}

interface CreateTopicQuestionsInput {
    readonly bookId: string;
    readonly topicId: string;
    readonly suggestions: readonly TopicQuestionSuggestion[];
    readonly logger: Logger;
}

const levelKeys: readonly LevelKey[] = ['junior', 'middle', 'senior'];

export const createTopicQuestionsFromSuggestions = async ({ bookId, topicId, suggestions, logger }: CreateTopicQuestionsInput): Promise<CreatedQuestion[]> => {
    try {
        const normalized = suggestions
            .filter(suggestion => !suggestion.optional)
            .map((suggestion) => ({
                textUk: suggestion.textUk.trim(),
                textEn: suggestion.textEn.trim(),
                level: suggestion.level
            }))
            .filter((item) => item.textUk.length > 0 && item.textEn.length > 0);

        if (normalized.length === 0) {
            return [];
        }

        const requestedLevels = Array.from(new Set(normalized.map((item) => item.level)));
        const levels = await prisma.$queryRaw<Array<{ id: string; key: string }>>`
            SELECT id, key FROM levels 
            WHERE key = ANY(${requestedLevels})
            ORDER BY order_index
        `;

        const levelMap = new Map<LevelKey, string>();
        for (const level of levels) {
            if (levelKeys.includes(level.key as LevelKey)) {
                levelMap.set(level.key as LevelKey, level.id);
            }
        }

        if (levelMap.size !== requestedLevels.length) {
            throw new Error('LEVEL_NOT_FOUND');
        }

        const createdQuestions = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const questionsData = normalized.map(suggestion => {
                const levelId = levelMap.get(suggestion.level);
                if (!levelId) {
                    throw new Error('LEVEL_NOT_FOUND');
                }
                return {
                    textUk: suggestion.textUk,
                    textEn: suggestion.textEn,
                    levelId
                };
            });

            const values = questionsData.map((q, index) => 
                `(gen_random_uuid()::text, $${index * 5 + 1}, $${index * 5 + 2}, '', '', $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5}, false, false, NOW(), NOW())`
            ).join(', ');

            const params = questionsData.flatMap(q => [q.textUk, q.textEn, bookId, topicId, q.levelId]);

            const result = await tx.$queryRawUnsafe(`
                INSERT INTO questions (id, text_uk, text_en, theory_uk, theory_en, book_id, topic_id, level_id, is_active, preview_mode, created_at, updated_at)
                VALUES ${values}
                RETURNING id, text_uk, text_en, book_id, topic_id, level_id
            `, ...params) as Array<{ 
                id: string; 
                text_uk: string; 
                text_en: string; 
                book_id: string; 
                topic_id: string; 
                level_id: string; 
            }>;

            return result.map((row) => {
                const levelKey = Array.from(levelMap.entries()).find(([_, id]) => id === row.level_id)?.[0];
                if (!levelKey) {
                    throw new Error('LEVEL_NOT_FOUND');
                }
                return {
                    id: row.id,
                    textUk: row.text_uk,
                    textEn: row.text_en,
                    level: levelKey,
                    bookId: row.book_id,
                    topicId: row.topic_id
                };
            });
        });


        return createdQuestions;
    } catch (error) {
        logger.error('Error in createTopicQuestionsFromSuggestions', { error });
        throw error;
    }
};