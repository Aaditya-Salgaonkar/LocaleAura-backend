export interface ArchitectInput {
  locationQuery: string;
  spaceType: 'listening_cafe' | 'senior_bistro' | 'boutique_retail' | 'hotel_lobby';
  seedNames: string[];
  vibeKeywords: string[];
}

export interface QlooEntity {
  entity_id: string;
  name: string;
  type: string;
  affinity: number;
  metadata?: Record<string, any>;
}

export interface QlooTagWeight {
  tag_id: string;
  name: string;
  weight: number;
}

export interface GeohashCell {
  geohash: string;
  latitude: number;
  longitude: number;
  affinity: number;
  competitorSaturation: number;
  opportunityScore: number;
}

export interface SensoryBlueprint {
  colorTempKelvin: number;
  ambientLux: number;
  taskLux: number;
  criMinimum: number;
  acousticNrcTarget: number;
  maxDecibels: number;
  fixtureRecommendations: string[];
  materialPalette: string[];
  driverTags: string[];
}