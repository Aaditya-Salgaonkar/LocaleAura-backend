import { ArchitectInput } from './types/locale-aura.types.js';

export const JUDGE_PRESETS: Record<string, ArchitectInput> = {
  tokyo_listening_cafe: {
    locationQuery: 'Silver Lake, Los Angeles',
    spaceType: 'listening_cafe',
    seedNames: ['Ryuichi Sakamoto', 'A24', 'Aesop'],
    vibeKeywords: ['analog', 'minimalist', 'nocturnal'],
  },
  austin_senior_bistro: {
    locationQuery: 'South Congress, Austin',
    spaceType: 'senior_bistro',
    seedNames: ['Willie Nelson', 'Chez Panisse', 'PBS'],
    vibeKeywords: ['warm', 'acoustic', 'accessible'],
  },
  brooklyn_hotel_lobby: {
    locationQuery: 'Williamsburg, Brooklyn',
    spaceType: 'hotel_lobby',
    seedNames: ['Khruangbin', 'Le Labo', 'The Criterion Collection'],
    vibeKeywords: ['intimate', 'craft', 'modern'],
  },
};