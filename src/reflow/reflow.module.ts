import { Module } from "@nestjs/common";
import { ReflowService } from "./reflow.service";
import { ReflowController } from "./reflow.controller";

@Module({
  imports: [],
  controllers: [ReflowController],
  providers: [ReflowService],
})
export class ReflowModule {}