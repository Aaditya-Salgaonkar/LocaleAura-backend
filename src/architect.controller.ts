import { Controller, Post, Get, Body, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ArchitectService } from './services/architect.service.js';
import type { ArchitectInput } from './types/locale-aura.types.js';
import { JUDGE_PRESETS } from './presets.js';

@Controller('api/architect')
export class ArchitectController {
  constructor(private readonly architectService: ArchitectService) {}

  @Get('presets')
  getPresets() {
    return JUDGE_PRESETS;
  }

  @Post('preset/:presetKey')
  async runPreset(@Param('presetKey') presetKey: string) {
    const preset = JUDGE_PRESETS[presetKey] || JUDGE_PRESETS.tokyo_listening_cafe;
    return this.architectService.runFullBlueprint(preset);
  }

  @Post('generate')
  async generateCustom(@Body() input: ArchitectInput) {
    return this.architectService.runFullBlueprint(input);
  }

  @Post('natural')
  async generateFromNaturalPrompt(@Body('prompt') prompt: string) {
    const structuredInput = await this.architectService.parseNaturalPrompt(prompt);
    return this.architectService.runFullBlueprint(structuredInput);
  }

  @Post('stream')
  async streamBlueprint(@Body() input: ArchitectInput, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const result = await this.architectService.runFullBlueprint(input, (step, detail) => {
        res.write(`data: ${JSON.stringify({ type: 'STEP', step, detail })}\n\n`);
      });
      res.write(`data: ${JSON.stringify({ type: 'COMPLETE', payload: result })}\n\n`);
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'ERROR', error: err.message })}\n\n`);
      res.end();
    }
  }
}