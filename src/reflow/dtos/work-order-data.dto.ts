import { IsArray, IsBoolean, IsNumber, IsString, Min } from 'class-validator';

export class WorkOrderDataDto {
  @IsString()
  workOrderNumber!: string;

  @IsString()
  manufacturingOrderId!: string;

  @IsString()
  workCenterId!: string;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @IsNumber()
  @Min(0)
  durationMinutes!: number;

  @IsBoolean()
  isMaintenance!: boolean;

  @IsArray()
  @IsString({ each: true })
  dependsOnWorkOrderIds!: string[];
}
