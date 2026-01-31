import { fetchAndExtract } from '@recall-link/content';
import {
  generateTagsAndSummary,
  mergeTagsWithExisting,
  type AIConfig,
} from '@recall-link/ai';

export type HandleFetchInput = {
  url: string;
};

export type HandleFetchResult = {
  title?: string;
  clean_text?: string;
  clean_html?: string;
};

export type HandleAiProcessInput = {
  cleanText: string;
  existingTags: string[];
  config: AIConfig;
  url?: string;
};

export type HandleAiProcessResult = {
  summary: string;
  tags: string[];
};

export const handleFetch = async (
  input: HandleFetchInput
): Promise<HandleFetchResult> => {
  const { url } = input;
  const { title, clean_text, clean_html } = await fetchAndExtract(url);

  return {
    title,
    clean_text,
    clean_html,
  };
};

export const handleAiProcess = async (
  input: HandleAiProcessInput
): Promise<HandleAiProcessResult> => {
  const { cleanText, existingTags, config } = input;
  const { tags: newTags, summary } = await generateTagsAndSummary(
    cleanText,
    config
  );
  const tags = await mergeTagsWithExisting(newTags, existingTags, config);

  return {
    summary,
    tags,
  };
};
