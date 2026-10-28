import { Injectable } from '@nestjs/common';
import { QlooEntity } from '../types/locale-aura.types.js';

@Injectable()
export class ValidatorService {
  validateGrounding(
    brands: QlooEntity[],
    artists: QlooEntity[],
    neighborPlaces: QlooEntity[]
  ) {
    const allEntities = [...brands, ...artists, ...neighborPlaces];
    
    //Check that entity_id exists and is a valid string/UUID
    const validUrnCount = allEntities.filter(
      (e) => e.entity_id && typeof e.entity_id === 'string' && e.entity_id.length > 0
    ).length;

    const groundingScore =
      allEntities.length > 0 ? Math.round((validUrnCount / allEntities.length) * 100) : 100;

    return {
      isFullyGrounded: groundingScore === 100,
      groundingScorePercent: groundingScore,
      verifiedEntityCount: validUrnCount, 
      allowedEntityNames: allEntities.map((e) => e.name),
      allowedEntityUrns: allEntities.map((e) => e.entity_id),
    };
  }
}