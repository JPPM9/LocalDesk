import type { MessageKey } from './de';

/** Englische Fassung – hat dieselben Schlüssel wie `de.ts` (sonst Fehler beim Bauen). */
export const en: Record<MessageKey, string> = {
  'error.invalidInput': 'Invalid input',
  'error.invalidId': 'Invalid ID',
  'error.invalidIdentifier': 'Invalid identifier.',
  'error.invalidSkillId': 'Invalid skill identifier',
  'error.invalidTemplate': 'Invalid template',
  'error.invalidCollection': 'Invalid collection',
  'error.invalidChatRequest': 'Invalid chat request',
  'error.invalidModelName': 'Invalid model name',
  'error.invalidPath': 'Invalid path.',
  'error.invalidMemory': 'Invalid memory.',
  'error.invalidReply': 'Invalid input in the confirmation.',
  'error.projectNotFound': 'Project not found',
  'error.collectionNotFound': 'Collection not found',
  'error.fileNotFound': 'File not found',
  'error.chatNotFound': 'Chat not found',
  'error.serverNotFound': 'Server not found',
  'error.skillNotFound': 'Skill not found',
  'error.skillGone': "This skill doesn't exist (any more).",
  'error.accountMissing': "This account doesn't exist.",
  'error.codeSessionMissing': "This code session doesn't exist.",
  'error.toolMissing': "The tool “{tool}” doesn't exist.",
  'error.toolUnavailable': "The tool “{tool}” doesn't exist or is turned off.",
  'chat.emptyAnswer':
    "The model didn't write an answer – it probably tried to call a tool incorrectly. Please ask again or pick a different model.",
};
