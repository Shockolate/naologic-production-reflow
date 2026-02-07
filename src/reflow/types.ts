export type DocumentType = "workOrder" | "workCenter" | "manufacturingOrder";

export type WorkOrderData = {
    workOrderNumber: string;
    manufacturingOrderId: string;
    workCenterId: string;

    // Timing
    startDate: string;
    endDate: string;
    /**
     * Total working time required
     */
    durationMinutes: number;

    // Constraints
    /**
     * Cannot be rescheduled if true
     */
    isMaintenance: boolean;

    // Dependencies (can have multiple parents)
    /**
     * All must complete before this starts
     */
    dependsOnWorkOrderIds: string[];
}

export type WorkCenterShift = {
    /**
     * 0-6, Sunday = 0
     */
    dayOfWeek: number;
    /**
     * 0-23
     */
    startHour: number;
    /**
     * 0-23
     */
    endHour: number;
}

export type WorkCenterMaintenanceWindow = {
    startDate: string;
    endDate: string;
    /**
     * Optional description
     */
    reason?: string;
}

export type WorkCenterData = {
    name: string;

    // Shifts
    shifts: WorkCenterShift[];

    // Maintenance windows (blocked time periods)
    maintenanceWindows: WorkCenterMaintenanceWindow[];
}

export type ManufacturingOrderData = {
    manufacturingOrderNumber: string;
    itemId: string;
    quantity: number;
    dueDate: string;
}

export type ReflowDocument = {
    docId: string;
    docType: DocumentType;
    data: WorkOrderData | WorkCenterData | ManufacturingOrderData;
}

export function isReflowDocument(document: unknown): document is ReflowDocument {
    return typeof document === "object" && document !== null && "docId" in document && "docType" in document && "data" in document;
}

export type WorkOrderDocument = ReflowDocument & {
    docType: "workOrder";
    data: WorkOrderData;
}

export function isWorkOrderDocument(document: unknown): document is WorkOrderDocument {
    return isReflowDocument(document) && document.docType === "workOrder";
}

export type WorkCenterDocument = ReflowDocument & {
    docType: "workCenter";
    data: WorkCenterData;
}

export function isWorkCenterDocument(document: unknown): document is WorkCenterDocument {
    return isReflowDocument(document) && document.docType === "workCenter";
}

export type ManufacturingOrderDocument = ReflowDocument & {
    docType: "manufacturingOrder";
    data: ManufacturingOrderData;
}

export function isManufacturingOrderDocument(document: unknown): document is ManufacturingOrderDocument {
    return isReflowDocument(document) && document.docType === "manufacturingOrder";
}

export type ReflowResult = {
    updatedWorkOrders: WorkOrderDocument[];
    changes: string[];
    explanation: string[];
}