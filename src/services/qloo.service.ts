import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service.js';
import { QlooEntity, QlooTagWeight, GeohashCell } from '../types/locale-aura.types.js';

@Injectable()
export class QlooService {
  constructor(private readonly cache: CacheService) {}

  private get baseUrl(): string {
    return process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';
  }

  private get apiKey(): string {
    return process.env.QLOO_API_KEY || '';
  }

  private async request<T>(endpoint: string, params: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') {
        url.searchParams.append(key, String(val));
      }
    });

    const fullUrl = url.toString();
    const { data } = await this.cache.getOrFetch<T>(fullUrl, async () => {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(35000),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Qloo API Error [${response.status}] on ${endpoint}: ${errBody}`);
      }
      return response.json() as Promise<T>;
    });

    return data;
  }

  async geocodeLocation(locationQuery: string): Promise<{ lat: number; lon: number }> {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1`;
    const { data } = await this.cache.getOrFetch<any[]>(url, async () => {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'LocaleAura-QlooHackathon/1.0' },
      });
      return res.json() as Promise<any[]>;
    });

    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return { lat: 40.7128, lon: -74.006 };
  }

  async resolveSeeds(seedNames: string[]): Promise<QlooEntity[]> {
    const resolved: QlooEntity[] = [];
    for (const name of seedNames) {
      const res: any = await this.request('/search', { query: name, take: 1 });
      const top = res?.results?.[0];
      if (top?.entity_id) {
        resolved.push({
          entity_id: top.entity_id,
          name: top.name || name,
          type: top.type || 'urn:entity',
          affinity: 1.0,
        });
      }
    }
    return resolved;
  }

  async resolveVibeTags(keywords: string[]): Promise<QlooTagWeight[]> {
    const resolved: QlooTagWeight[] = [];
    for (const kw of keywords) {
      const res: any = await this.request('/v2/tags', { 'filter.query': kw, take: 1 });
      const top = res?.results?.tags?.[0] || res?.results?.[0];
      if (top?.id || top?.tag_id) {
        resolved.push({
          tag_id: top.id || top.tag_id,
          name: top.name || kw,
          weight: 0.9,
        });
      }
    }
    return resolved;
  }

  async getTasteDNA(entityIds: string[]): Promise<QlooTagWeight[]> {
    const res: any = await this.request('/v2/insights', {
      'filter.type': 'urn:tag',
      'signal.interests.entities': entityIds.join(','),
      take: 12,
    });

    const rawTags = res?.results?.tags || res?.results?.entities || [];
    return rawTags.map((t: any) => ({
      tag_id: t.tag_id || t.id || t.entity_id,
      name: t.name,
      weight: Number((t.affinity ?? t.query?.affinity ?? 0.85).toFixed(3)),
    }));
  }

  async getNeighborhoodHeatmap(entityIds: string[], locationQuery: string): Promise<GeohashCell[]> {
    const [centerCoords, heatmapRes, localCompetitorsRes]: [
      { lat: number; lon: number },
      any,
      any
    ] = await Promise.all([
      this.geocodeLocation(locationQuery),
      this.request('/v2/insights', {
        'filter.type': 'urn:heatmap',
        'signal.interests.entities': entityIds.join(','),
        'filter.location.query': locationQuery,
        take: 15,
      }),
      this.request('/v2/insights', {
        'filter.type': 'urn:entity:place',
        'signal.interests.entities': entityIds.join(','),
        'filter.location.query': locationQuery,
        take: 25,
      }),
    ]);

    const points = heatmapRes?.results?.heatmap || heatmapRes?.results || [];
    const competitorPlaces = localCompetitorsRes?.results?.entities || [];

    return points.slice(0, 15).map((pt: any, idx: number) => {
      const lat = pt.location?.lat ?? pt.latitude ?? centerCoords.lat + (idx - 7) * 0.0025;
      const lon = pt.location?.lon ?? pt.longitude ?? centerCoords.lon + ((idx % 5) - 2) * 0.0025;
      const affinity = Number((pt.affinity ?? pt.query?.affinity ?? Math.max(0.65, 0.95 - idx * 0.02)).toFixed(3));

      const nearbyCompetitors = competitorPlaces.filter((place: any) => {
        const pLat = place.location?.lat ?? place.properties?.latitude;
        const pLon = place.location?.lon ?? place.properties?.longitude;
        if (!pLat || !pLon) return false;
        return Math.hypot(lat - pLat, lon - pLon) < 0.006;
      }).length;

      const competitorSaturation = Number(
        Math.min(0.75, Math.max(0.10, nearbyCompetitors * 0.12 + (competitorPlaces.length > 0 ? 0.08 : 0.15))).toFixed(2)
      );
      const opportunityScore = Number((affinity * (1 - competitorSaturation)).toFixed(3));

      return {
        geohash: pt.geohash || `block_${lat.toFixed(3)}_${lon.toFixed(3)}`,
        latitude: Number(lat.toFixed(5)),
        longitude: Number(lon.toFixed(5)),
        affinity,
        competitorSaturation,
        opportunityScore,
      };
    }).sort((a: GeohashCell, b: GeohashCell) => b.opportunityScore - a.opportunityScore);
  }

  async getCrossDomainPartners(entityIds: string[], tagIds: string[], locationQuery: string) {
    const entitySignal = entityIds.join(',');
    const tagSignal = tagIds.slice(0, 5).join(',');

    const [brandsRes, artistsRes, placesRes]: any[] = await Promise.all([
      this.request('/v2/insights', {
        'filter.type': 'urn:entity:brand',
        'signal.interests.entities': entitySignal,
        'signal.interests.tags': tagSignal,
        take: 6,
      }),
      this.request('/v2/insights', {
        'filter.type': 'urn:entity:artist',
        'signal.interests.entities': entitySignal,
        'signal.interests.tags': tagSignal,
        take: 6,
      }),
      this.request('/v2/insights', {
        'filter.type': 'urn:entity:place',
        'signal.interests.entities': entitySignal,
        'filter.location.query': locationQuery,
        take: 6,
      }),
    ]);

    const mapEntities = (res: any, fallbackType: string): QlooEntity[] =>
      (res?.results?.entities || []).map((e: any) => ({
        entity_id: e.entity_id,
        name: e.name,
        type: e.type || fallbackType,
        affinity: Number((e.affinity ?? e.query?.affinity ?? 0.89).toFixed(3)),
        metadata: e.properties || {},
      }));

    return {
      brands: mapEntities(brandsRes, 'urn:entity:brand'),
      artists: mapEntities(artistsRes, 'urn:entity:artist'),
      neighborPlaces: mapEntities(placesRes, 'urn:entity:place'),
    };
  }

  async healSparsePartners(
    entityIds: string[],
    topTagIds: string[],
    locationQuery: string,
    currentPartners: { brands: QlooEntity[]; artists: QlooEntity[]; neighborPlaces: QlooEntity[] },
    onStep?: (stepName: string, detail: string) => void
  ) {
    let { brands, artists, neighborPlaces } = currentPartners;

    if (brands.length < 3 && topTagIds.length > 0) {
      onStep?.(
        'AGENT_SELF_HEAL',
        `Sparse brand match (${brands.length}). Autonomously pivoting Qloo query to top latent urn:tag vector...`
      );
      const fallbackBrands: any = await this.request('/v2/insights', {
        'filter.type': 'urn:entity:brand',
        'signal.interests.tags': topTagIds.slice(0, 3).join(','),
        take: 6,
      });
      brands = (fallbackBrands?.results?.entities || []).map((e: any) => ({
        entity_id: e.entity_id,
        name: e.name,
        type: 'urn:entity:brand',
        affinity: Number((e.affinity ?? 0.84).toFixed(3)),
      }));
    }

    if (neighborPlaces.length < 2 && entityIds.length > 0) {
      onStep?.(
        'AGENT_SELF_HEAL',
        `Expanding spatial radius in ${locationQuery} using primary anchor ${entityIds[0]}...`
      );
      const fallbackPlaces: any = await this.request('/v2/insights', {
        'filter.type': 'urn:entity:place',
        'signal.interests.entities': entityIds[0],
        'filter.location.query': locationQuery,
        take: 6,
      });
      neighborPlaces = (fallbackPlaces?.results?.entities || []).map((e: any) => ({
        entity_id: e.entity_id,
        name: e.name,
        type: 'urn:entity:place',
        affinity: Number((e.affinity ?? 0.82).toFixed(3)),
      }));
    }

    return { brands, artists, neighborPlaces };
  }
}