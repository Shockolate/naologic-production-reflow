import { Type } from "class-transformer";
import { IsArray, ValidateNested } from "class-validator";
import {
    ManufacturingOrderDocumentDto,
    ReflowDocumentDto,
    WorkCenterDocumentDto,
    WorkOrderDocumentDto,
} from "./reflow-document.dto";

export class ProcessReflowDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Object, {
        discriminator: {
            property: "docType",
            subTypes: [
                { value: WorkOrderDocumentDto, name: "workOrder" },
                { value: WorkCenterDocumentDto, name: "workCenter" },
                { value: ManufacturingOrderDocumentDto, name: "manufacturingOrder" },
            ],
        },
    })
    documents!: ReflowDocumentDto[];
}
