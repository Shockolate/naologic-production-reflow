import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { ManufacturingOrderDataDto } from './manufacturing-order-data.dto';
import { WorkCenterDataDto } from './work-center-data.dto';
import { WorkOrderDataDto } from './work-order-data.dto';

export class WorkOrderDocumentDto {
  @IsString()
  docId!: string;

  @IsString()
  docType: 'workOrder' = 'workOrder' as const;

  @ValidateNested()
  @Type(() => WorkOrderDataDto)
  data!: WorkOrderDataDto;
}

export class WorkCenterDocumentDto {
  @IsString()
  docId!: string;

  @IsString()
  docType: 'workCenter' = 'workCenter' as const;

  @ValidateNested()
  @Type(() => WorkCenterDataDto)
  data!: WorkCenterDataDto;
}

export class ManufacturingOrderDocumentDto {
  @IsString()
  docId!: string;

  @IsString()
  docType: 'manufacturingOrder' = 'manufacturingOrder' as const;

  @ValidateNested()
  @Type(() => ManufacturingOrderDataDto)
  data!: ManufacturingOrderDataDto;
}

export type ReflowDocumentDto =
  | WorkOrderDocumentDto
  | WorkCenterDocumentDto
  | ManufacturingOrderDocumentDto;
