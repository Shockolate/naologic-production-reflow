import { ManufacturingOrderData, ManufacturingOrderDocument, WorkCenterData, WorkCenterDocument, WorkCenterMaintenanceWindow, WorkCenterShift, WorkOrderData, WorkOrderDocument } from "./types";

/**
 * Creates a valid ERP-style WorkOrderData object (per BE-technical-test.md).
 * Only workOrderNumber and dependsOnWorkOrderIds are required for graph building;
 * other fields are filled with valid defaults for a realistic work order.
 */
export function workOrder(
    workOrderNumber: string,
    dependsOnWorkOrderIds: string[] = [],
    overrides: Partial<WorkOrderData> = {}
): WorkOrderData {
    return {
        workOrderNumber,
        manufacturingOrderId: `MO-${workOrderNumber}`,
        workCenterId: "WC-001",
        startDate: "2025-01-06T08:00:00.000Z",
        endDate: "2025-01-06T10:00:00.000Z",
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds,
        ...overrides,
    };
}

export function workOrderDocument(
    workOrderNumber: string,
    dependsOnWorkOrderIds: string[] = [],
    overrides: Partial<WorkOrderData> = {}): WorkOrderDocument {
    return {
        docId: `WOD-${workOrderNumber}`,
        docType: "workOrder",
        data: workOrder(workOrderNumber, dependsOnWorkOrderIds, overrides),
    };
}

export function workCenter(
    name: string,
    shifts: WorkCenterShift[] = [],
    maintenanceWindows: WorkCenterMaintenanceWindow[] = [],
    overrides: Partial<WorkCenterData> = {}
): WorkCenterData {
    return {
        name,
        shifts,
        maintenanceWindows,
        ...overrides,
    };
}

export function workCenterDocument(
    name: string,
    shifts: WorkCenterShift[] = [],
    maintenanceWindows: WorkCenterMaintenanceWindow[] = [],
    overrides: Partial<WorkCenterData> = {}): WorkCenterDocument {
    return {
        docId: `WCD-${name}`,
        docType: "workCenter",
        data: workCenter(name, shifts, maintenanceWindows, overrides),
    };
}

export function manufacturingOrder(
    manufacturingOrderNumber: string,
    overrides: Partial<ManufacturingOrderData> = {}
): ManufacturingOrderData {
    return {
        manufacturingOrderNumber,
        itemId: "ITEM-001",
        quantity: 1,
        dueDate: "2025-01-06T10:00:00.000Z",
        ...overrides,
    };
}

export function manufacturingOrderDocument(
    manufacturingOrderNumber: string,
    overrides: Partial<ManufacturingOrderData> = {}): ManufacturingOrderDocument {
    return {
        docId: `MOD-${manufacturingOrderNumber}`,
        docType: "manufacturingOrder",
        data: manufacturingOrder(manufacturingOrderNumber, overrides),
    };
}