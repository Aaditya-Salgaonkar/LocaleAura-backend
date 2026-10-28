import { Injectable } from '@nestjs/common';
import { QlooTagWeight, SensoryBlueprint, ArchitectInput } from '../types/locale-aura.types.js';

@Injectable()
export class SensoryEngineService {
  computeSensoryBlueprint(
    spaceType: ArchitectInput['spaceType'],
    tasteTags: QlooTagWeight[]
  ): SensoryBlueprint {
    const tagNames = tasteTags.map((t) => t.name.toLowerCase()).join(' ');

    let colorTempKelvin = 2700;
    let ambientLux = 150;
    let taskLux = 300;
    let criMinimum = 92;
    let acousticNrcTarget = 0.65;
    let maxDecibels = 68;
    const fixtureRecommendations: string[] = [];
    const materialPalette: string[] = [];

    if (/(analog|intimate|nocturnal|vinyl|cozy|indie|noir|warm)/.test(tagNames)) {
      colorTempKelvin -= 300;
      ambientLux = 110;
      acousticNrcTarget = 0.78;
      fixtureRecommendations.push(
        '2400K Warm-Dim Recessed Gimbal Downlights (DALI-2 / 0-10V dimmable)',
        'Low-glare indirect architectural cove LED strips (CRI 97+, R9 > 90)'
      );
      materialPalette.push('Slatted walnut acoustic baffling', 'Honed lime plaster', 'Heavy wool drapery');
    }

    if (/(minimalist|modern|craft|scandinavian|gallery|precision)/.test(tagNames)) {
      criMinimum = 96;
      fixtureRecommendations.push(
        '15-degree narrow-beam museum track spotlights on merchandise/table surfaces'
      );
      materialPalette.push('Brushed anodized aluminum', 'Micro-cement flooring with cork underlayment');
    }

    if (spaceType === 'senior_bistro') {
      colorTempKelvin = 3200;
      ambientLux = 320;
      taskLux = 450;
      criMinimum = 95;
      acousticNrcTarget = 0.85;
      maxDecibels = 58;
      fixtureRecommendations.unshift(
        '3200K Anti-Glare Baffled Pendant Luminaires (UGR < 16 for zero macular glare)',
        'Continuous 3000K recessed pathway step-lighting along booth perimeters'
      );
      materialPalette.unshift('High-contrast matte table surfaces', 'Micro-perforated ceiling acoustic clouds');
    } else if (spaceType === 'listening_cafe') {
      maxDecibels = 76;
      acousticNrcTarget = 0.80;
    }

    return {
      colorTempKelvin,
      ambientLux,
      taskLux,
      criMinimum,
      acousticNrcTarget,
      maxDecibels,
      fixtureRecommendations: fixtureRecommendations.length
        ? fixtureRecommendations
        : ['2700K Tunable White Architectural Pendants (CRI 95+)'],
      materialPalette: materialPalette.length
        ? materialPalette
        : ['Natural oak acoustic panels', 'Matte mineral paint'],
      driverTags: tasteTags.slice(0, 5).map((t) => `${t.name} (${Math.round(t.weight * 100)}%)`),
    };
  }
}