import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { StorageService } from './storage.service';

@Module({
  controllers: [MaterialsController],
  providers: [MaterialsService, StorageService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
