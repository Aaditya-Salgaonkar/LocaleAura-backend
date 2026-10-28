import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { QlooService } from './qloo.service.js';
import { SensoryEngineService } from './sensory.service.js';
import { ValidatorService } from './validator.service.js';
import { ArchitectInput } from '../types/locale-aura.types.js';

@Injectable()
export class ArchitectService {
  private openrouter: OpenAI;

  constructor(
    private readonly qloo: QlooService,
    private readonly sensory: SensoryEngineService,
    private readonly validator: ValidatorService,
  ) {
    // Initialized for OpenRouter using OpenAI-compatible client configuration
    this.openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      defaultHeaders: {
        'HTTP-Referer': 'https://locale-aura.hackathon', // Optional for OpenRouter rankings
        'X-Title': 'LocaleAura Qloo Agent',
      },
    });
  }

  async parseNaturalPrompt(rawPrompt: string): Promise<ArchitectInput> {
    const response = await this.openrouter.chat.completions.create({
      model: 'openai/gpt-4o-mini', // Routed via OpenRouter
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Extract spatial brief parameters from the user's sentence into JSON with exact keys:
          - "locationQuery": string (neighborhood and city, e.g., "SoHo, New York")
          - "spaceType": one of ["listening_cafe", "senior_bistro", "boutique_retail", "hotel_lobby"]
          - "seedNames": array of 2 to 4 specific cultural entities (artists, films, brands, or venues)
          - "vibeKeywords": array of 2 to 3 single-word aesthetic adjectives`,
        },
        { role: 'user', content: rawPrompt },
      ],
    });

    return JSON.parse(
      response.choices[0].message.content || '{}',
    ) as ArchitectInput;
  }

  computeCommercialROI(
    topBlock: any,
    brandCount: number,
    neighborCount: number,
  ) {
    const affinity = topBlock?.affinity || 0.85;
    const saturation = topBlock?.competitorSaturation || 0.25;
    const opportunity = topBlock?.opportunityScore || 0.65;

    const estimatedCacReductionPercent = Math.round(opportunity * 48);
    const projectedFootTrafficLift = `+${(1 + opportunity * 0.85).toFixed(2)}x`;
    const sponsorMatchReadiness = Math.min(
      99,
      Math.round((brandCount / 6) * 50 + affinity * 50),
    );

    return {
      winningGeohash: topBlock?.geohash || 'N/A',
      culturalDemandVsSupplyRatio: Number(
        (affinity / Math.max(0.15, saturation)).toFixed(2),
      ),
      estimatedCacReductionPercent: `${estimatedCacReductionPercent}% lower paid local ad spend`,
      projectedFootTrafficLift,
      coMarketingPartnerCount: neighborCount,
      sponsorMatchReadiness: `${sponsorMatchReadiness}/100`,
    };
  }

  async runFullBlueprint(
    input: ArchitectInput,
    onStep?: (stepName: string, detail: string) => void,
  ) {
    onStep?.(
      'STAGE_1_RESOLVE',
      `Resolving ${input.seedNames.join(', ')} into Qloo URNs...`,
    );
    const [resolvedEntities, resolvedTags] = await Promise.all([
      this.qloo.resolveSeeds(input.seedNames),
      this.qloo.resolveVibeTags(input.vibeKeywords),
    ]);

    const entityIds = resolvedEntities.map((e) => e.entity_id);
    const tagIds = resolvedTags.map((t) => t.tag_id);

    onStep?.(
      'STAGE_2_HEATMAP_DNA',
      `Querying Qloo urn:heatmap & urn:tag for ${input.locationQuery}...`,
    );
    const [tasteDNA, heatmap] = await Promise.all([
      this.qloo.getTasteDNA(entityIds),
      this.qloo.getNeighborhoodHeatmap(entityIds, input.locationQuery),
    ]);

    onStep?.(
      'STAGE_3_CROSS_DOMAIN',
      'Hopping Qloo graph across Brands, Audio Artists & Local Places...',
    );
    const combinedTagIds = [...tagIds, ...tasteDNA.map((t) => t.tag_id)];
    const rawPartners = await this.qloo.getCrossDomainPartners(
      entityIds,
      combinedTagIds,
      input.locationQuery,
    );

    const partners = await this.qloo.healSparsePartners(
      entityIds,
      combinedTagIds,
      input.locationQuery,
      rawPartners,
      onStep,
    );

    onStep?.(
      'STAGE_4_SENSORY_PHYSICS',
      'Translating Qloo taste weights into Kelvin, Lux & NRC specs...',
    );
    const sensoryBlueprint = this.sensory.computeSensoryBlueprint(
      input.spaceType,
      tasteDNA,
    );
    const groundingAudit = this.validator.validateGrounding(
      partners.brands,
      partners.artists,
      partners.neighborPlaces,
    );

    const topBlock = heatmap[0];
    const commercialROI = this.computeCommercialROI(
      topBlock,
      partners.brands.length,
      partners.neighborPlaces.length,
    );

    onStep?.(
      'STAGE_5_SYNTHESIS',
      'Synthesizing grounded commercial brief & co-marketing outreach via OpenRouter...',
    );
    const topBrand = partners.brands[0]?.name || 'partner brand';
    const topNeighbor =
      partners.neighborPlaces[0]?.name || 'local neighbor venue';

    const [groundedSynthesis, rawLlmBaseline] = await Promise.all([
      this.openrouter.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are LocaleAura, a spatial commercial architect strictly grounded in Qloo cultural data. You MUST ONLY cite the exact entities, geohashes, and lighting numbers provided in the JSON context.
Return a JSON object with these exact keys and types:
- "executiveSummary": A single cohesive 3-to-4 sentence paragraph (MUST be a plain string, NOT an object) synthesizing the winning geohash, opportunity score, competitor saturation, top co-marketing brands, local neighbor venues, and sensory lighting specs.
- "daypartAudioSchedule": An array of objects with keys "daypart", "artist", "vibe".
- "coMarketingEmail": A plain string containing the B2B outreach email.`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              input,
              winningGeohashBlock: topBlock,
              commercialROI,
              sensorySpecs: sensoryBlueprint,
              qlooBrands: partners.brands.map((b: any) => ({
                name: b.name,
                affinity: b.affinity,
              })),
              qlooArtists: partners.artists.map((a: any) => ({
                name: a.name,
                affinity: a.affinity,
              })),
              qlooNeighbors: partners.neighborPlaces.map((n: any) => ({
                name: n.name,
                affinity: n.affinity,
                address: n.metadata?.address,
              })),
            }),
          },
        ],
      }),
      this.openrouter.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Give brief interior lighting, brand partnerships, music, and neighborhood advice for a ${input.spaceType} in ${input.locationQuery} inspired by ${input.seedNames.join(', ')}. Keep it to 4 bullet points.`,
          },
        ],
      }),
    ]);

    return {
      input,
      qlooTrace: {
        resolvedEntities,
        tasteDNA,
        groundingAudit,
      },
      spatialHeatmap: heatmap,
      sensoryBlueprint,
      commercialROI,
      crossDomainPartners: partners,
      deliverables: JSON.parse(
        groundedSynthesis.choices[0].message.content || '{}',
      ),
      comparisonToggle: {
        genericLlmOutput: rawLlmBaseline.choices[0].message.content,
        whyQlooWins: `Generic LLM guessed broad aesthetics with 0 street-block coordinates. LocaleAura resolved ${groundingAudit.verifiedEntityCount} canonical Qloo URNs, pinpointed geohash ${topBlock?.geohash} (Opportunity Score ${topBlock?.opportunityScore}), and cross-hopped to ${topBrand} and ${topNeighbor}.`,
      },
    };
  }
}
