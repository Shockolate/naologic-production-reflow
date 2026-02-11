import { Body, Controller, Post } from "@nestjs/common";
import {
    ManufacturingOrderDocumentDto,
    ProcessReflowDto,
    ReflowDocumentDto,
    WorkCenterDocumentDto,
    WorkOrderDocumentDto,
} from "./dtos";
import { ReflowService } from "./reflow.service";


function isWorkOrderDocumentDto(doc: ReflowDocumentDto): doc is WorkOrderDocumentDto {
    return doc.docType === "workOrder";
}

function isWorkCenterDocumentDto(doc: ReflowDocumentDto): doc is WorkCenterDocumentDto {
    return doc.docType === "workCenter";
}

function isManufacturingOrderDocumentDto(doc: ReflowDocumentDto): doc is ManufacturingOrderDocumentDto {
    return doc.docType === "manufacturingOrder";
}

@Controller("reflow")
export class ReflowController {
    constructor(private readonly reflowService: ReflowService) {}

    @Post()
    processReflow(@Body() body: ProcessReflowDto) {
        const input = {
            workOrders: body.documents.filter(isWorkOrderDocumentDto),
            workCenters: body.documents.filter(isWorkCenterDocumentDto),
            manufacturingOrders: body.documents.filter(isManufacturingOrderDocumentDto),
        };
        return this.reflowService.reflow(input);
    }
}