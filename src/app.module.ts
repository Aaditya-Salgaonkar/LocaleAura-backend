import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ArchitectController } from './architect.controller.js';
import { CacheService } from './services/cache.service.js';
import { QlooService } from './services/qloo.service.js';
import { SensoryEngineService } from './services/sensory.service.js';
import { ValidatorService } from './services/validator.service.js';
import { ArchitectService } from './services/architect.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
  ],
  controllers: [AppController, ArchitectController],
  providers: [
    AppService,
    CacheService,
    QlooService,
    SensoryEngineService,
    ValidatorService,
    ArchitectService,
  ],
})
export class AppModule {}