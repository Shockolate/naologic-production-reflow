import { Module } from '@nestjs/common';
import { ReflowService } from './reflow.service';
import { ReflowController } from './reflow.controller';
import { WorkflowBuilderService } from './workflow-builder.service';

@Module({
  imports: [],
  controllers: [ReflowController],
  providers: [ReflowService, WorkflowBuilderService],
})
export class ReflowModule {}
