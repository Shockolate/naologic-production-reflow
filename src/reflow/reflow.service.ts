import { Injectable } from "@nestjs/common";
import { ReflowDocument, WorkOrderDocument, WorkCenterDocument, ManufacturingOrderDocument, ReflowResult } from "./types";
import { WorkflowBuilderService } from "./workflow-builder.service";

type ReflowServiceInput = {
    workOrders: WorkOrderDocument[];
    workCenters: WorkCenterDocument[];
    manufacturingOrders: ManufacturingOrderDocument[];
}

@Injectable()
export class ReflowService {
    constructor() {}

    reflow(input: ReflowServiceInput): ReflowResult {
        return {
            updatedWorkOrders: [],
            changes: [],
            explanation: [],
        }
    }
}