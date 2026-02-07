import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReflowModule } from './reflow/reflow.module';

@Module({
  imports: [ReflowModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
