import { Type } from "class-transformer";
import { IsIn, IsString, ValidateNested } from "class-validator";
import { ManufacturingOrderDataDto } from "./manufacturing-order-data.dto";
import { WorkCenterDataDto } from "./work-center-data.dto";
import { WorkOrderDataDto } from "./work-order-data.dto";

const REFLOW_DOC_TYPES = ["workOrder", "workCenter", "manufacturingOrder"] as const;

export class WorkOrderDocumentDto {
    @IsString()
    docId!: string;

    @IsIn(REFLOW_DOC_TYPES)
    docType!: "workOrder";

    @ValidateNested()
    @Type(() => WorkOrderDataDto)
    data!: WorkOrderDataDto;
}

export class WorkCenterDocumentDto {
    @IsString()
    docId!: string;

    @IsIn(REFLOW_DOC_TYPES)
    docType!: "workCenter";

    @ValidateNested()
    @Type(() => WorkCenterDataDto)
    data!: WorkCenterDataDto;
}

export class ManufacturingOrderDocumentDto {
    @IsString()
    docId!: string;

    @IsIn(REFLOW_DOC_TYPES)
    docType!: "manufacturingOrder";

    @ValidateNested()
    @Type(() => ManufacturingOrderDataDto)
    data!: ManufacturingOrderDataDto;
}

export type ReflowDocumentDto =
    | WorkOrderDocumentDto
    | WorkCenterDocumentDto
    | ManufacturingOrderDocumentDto;
