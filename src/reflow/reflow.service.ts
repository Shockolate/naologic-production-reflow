import { Injectable } from "@nestjs/common";
import { ReflowResult, WorkCenterData, WorkOrderData, ReflowServiceInput, WorkOrderDocument, WorkCenterDocument } from "./types";
import { WorkflowBuilderService } from "./workflow-builder.service";
import { DateTime, Interval } from "luxon";
import { DateTimeUtil } from "./DateTimeUtil";


export type ReflowChange = {
    workOrderNumber: string;
    changeType: "startDate" | "endDate";
    oldValue: string;
    newValue: string;
    reason: string;
}

@Injectable()
export class ReflowService {
    constructor(private readonly workflowBuilderService: WorkflowBuilderService) { }

    reflow(input: ReflowServiceInput): ReflowResult {
        // Track the assignments of work orders to work centers.
        const assignments = new Map<string, { workCenterName: string, workOrder: WorkOrderData }>();

        // Populate the work centers map for easy retrieval
        const workCenters = ReflowService.populateWorkCenters(input.workCenters);

        const sortedMaintenanceWorkOrders = input.workOrders.map((document) => (document.data)).filter(wo => wo.isMaintenance).sort((a, b) => DateTime.fromISO(a.startDate).diff(DateTime.fromISO(b.startDate)).toMillis());
        const sortedOtherWorkOrders = input.workOrders.map((document) => (document.data)).filter(wo => !wo.isMaintenance).sort((a, b) => DateTime.fromISO(a.startDate).diff(DateTime.fromISO(b.startDate)).toMillis());

        // Process work orders into a DAG and sort them in topological order. Process maintenance work orders first, then other work orders.
        const workflowGraph = this.workflowBuilderService.buildWorkflow(sortedMaintenanceWorkOrders.concat(sortedOtherWorkOrders));
        const sortedWorkOrderNumbers = this.workflowBuilderService.getSortedWorkOrderNumbers(workflowGraph);

        // Track the booked slots by work center.
        const bookedSlotsByCenter = new Map<string, Interval[]>();
        // Track the completion times of completed work orders.
        const completionTimesOfCompletedWorkOrders = new Map<string, DateTime>();

        // Track the changes to the work orders.
        const changes: ReflowChange[] = [];

        // Process work orders in topological order
        for (const workOrderNumber of sortedWorkOrderNumbers) {
            const workOrder = workflowGraph.getNodeAttribute(workOrderNumber, 'workOrder');
            if (workOrder.isMaintenance) {
                // Keep the maintenance work order in the same position
                completionTimesOfCompletedWorkOrders.set(workOrderNumber, DateTime.fromISO(workOrder.endDate));
                assignments.set(workOrderNumber, {
                    workCenterName: workOrder.workCenterId,
                    workOrder: {
                        ...workOrder,
                        startDate: workOrder.startDate,
                        endDate: workOrder.endDate,
                    }
                });

                // Insert the booked slot into the booked slots map for the work center.
                bookedSlotsByCenter.set(workOrder.workCenterId, [...(bookedSlotsByCenter.get(workOrder.workCenterId) || []), Interval.fromDateTimes(DateTime.fromISO(workOrder.startDate), DateTime.fromISO(workOrder.endDate))]);
                continue;
            }

            // Get the work center for the work order.
            const workCenter = workCenters.get(workOrder.workCenterId);
            if (!workCenter) {
                throw new Error(`Work center ${workOrder.workCenterId} not found`);
            }
            const duration = workOrder.durationMinutes;

            let earliestStart = DateTime.fromISO(workOrder.startDate);

            // Calculate earliest start by first checking the completion times of the parent work orders.
            // We know that the parent work orders have been processed first because we sorted the work orders in topological order.
            let parentChange: ReflowChange | undefined;
            for (const parentId of workOrder.dependsOnWorkOrderIds) {
                if (parentId in completionTimesOfCompletedWorkOrders) {
                    earliestStart = DateTime.max(earliestStart, completionTimesOfCompletedWorkOrders.get(parentId)!);
                    if (!earliestStart.equals(DateTime.fromISO(workOrder.startDate))) {
                        parentChange = {
                            workOrderNumber: workOrderNumber,
                            changeType: "startDate",
                            oldValue: workOrder.startDate,
                            newValue: earliestStart.toISO()!,
                            reason: `Parent Work Order ${parentId} completed at ${earliestStart.toISO()}`,
                        };
                    }
                }
            }

            if (parentChange) {
                changes.push(parentChange);
            }

            let shiftOrMaintenanceChange: ReflowChange | undefined;
            // Clamp to start of next available window if earliestStart is not in shift
            if (!ReflowService.isAvailable(workCenter, earliestStart)) {
                const oldEarliestStart = earliestStart;
                earliestStart = ReflowService.nextAvailableMoment(workCenter, earliestStart);

                // Updating the time start change if the earliest start has changed
                if (!earliestStart.equals(DateTime.fromISO(parentChange ? parentChange.newValue : workOrder.startDate))) {
                    shiftOrMaintenanceChange = {
                        workOrderNumber: workOrderNumber,
                        changeType: "startDate",
                        oldValue: parentChange ? parentChange.newValue : workOrder.startDate,
                        newValue: earliestStart.toISO()!,
                        reason: `WorkCenter ${workCenter.name} does not have a shift or is in a maintenance window at ${oldEarliestStart.toISO()}`,
                    };
                }
            }

            if (shiftOrMaintenanceChange) {
                changes.push(shiftOrMaintenanceChange);
            }

            // get the booked slot
            const interval = ReflowService.firstFreeSlot(workCenter, bookedSlotsByCenter.get(workCenter.name) || [], earliestStart, duration);

            if (interval.start!.diff(earliestStart).toMillis() > 0) {
                changes.push({
                    workOrderNumber: workOrderNumber,
                    changeType: "startDate",
                    oldValue: earliestStart.toISO() || "",
                    newValue: interval.start!.toISO() || "",
                    reason: `WorkCenter ${workCenter.name} is processing other WorkOrders at ${earliestStart.toISO()}`,
                });
            }

            // record the booked slot
            assignments.set(workOrderNumber, {
                workCenterName: workCenter.name, workOrder: {
                    ...workOrder,
                    startDate: interval.start!.setZone('UTC').toISO()!,
                    endDate: interval.end!.setZone('UTC').toISO()!,
                }
            });
            completionTimesOfCompletedWorkOrders.set(workOrderNumber, interval.end!);

            // Insert the booked slot into the booked slots map.
            bookedSlotsByCenter.set(workCenter.name, [...(bookedSlotsByCenter.get(workCenter.name) || []), interval]);
        }

        return {
            updatedWorkOrders: Array.from(assignments.values()).map(({ workOrder }) => workOrder),
            changes: ReflowService.generateWhatChanged(changes),
            explanation: ReflowService.generateExplanation(changes),
        }
    }

    /** Check if the date time is in a shift */
    static isInShift(workCenter: WorkCenterData, dateTime: DateTime): boolean {
        for (const shift of workCenter.shifts) {
            if (shift.dayOfWeek === DateTimeUtil.FromDateTimeWeekday(dateTime)) {
                if (shift.startHour <= dateTime.hour && shift.endHour > dateTime.hour) {
                    return true;
                }
            }
        }
        return false;
    }

    /** Check if the date time is in a maintenance window */
    static isInMaintenanceWindow(workCenter: WorkCenterData, dateTime: DateTime): boolean {
        for (const maintenanceWindow of workCenter.maintenanceWindows) {
            if (dateTime >= DateTime.fromISO(maintenanceWindow.startDate) && dateTime < DateTime.fromISO(maintenanceWindow.endDate)) {
                return true;
            }
        }
        return false;
    }

    /** Check if the work center is available at the given date time */
    static isAvailable(workCenter: WorkCenterData, dateTime: DateTime): boolean {
        return ReflowService.isInShift(workCenter, dateTime) && !ReflowService.isInMaintenanceWindow(workCenter, dateTime);
    }

    /** Find the next time where the work center is available */
    static nextAvailableMoment(workCenter: WorkCenterData, dateTime: DateTime): DateTime {
        let candidateDateTime = dateTime;
        while (!ReflowService.isAvailable(workCenter, candidateDateTime)) {
            candidateDateTime = candidateDateTime.plus({ minutes: 1 });
        }
        return candidateDateTime;
    }


    static addWorkingMinutes(workCenter: WorkCenterData, timeStart: DateTime, durationMinutes: number): DateTime {
        let remainingMinutes = durationMinutes;
        let currentTime = timeStart;
        while (remainingMinutes > 0) {
            if (!ReflowService.isAvailable(workCenter, currentTime)) {
                currentTime = ReflowService.nextAvailableMoment(workCenter, currentTime);
                continue;
            }
            remainingMinutes -= 1;
            currentTime = currentTime.plus({ minutes: 1 });
        }
        return currentTime;
    }

    /**
     * Find the first free slot in the work center
     * 
     * @param workCenter 
     * @param bookedSlots - The slots that are already booked. Must be non-overlapping.
     * @param earliestAvailable 
     * @param durationMinutes 
     */
    static firstFreeSlot(workCenter: WorkCenterData, bookedSlots: Interval[], earliestAvailable: DateTime, durationMinutes: number): Interval {
        const sortedBookedSlots = ReflowService.sortBookedSlots(bookedSlots);
        let candidateStartTime = earliestAvailable;

        // To avoid an infinite loop, limit to the number of possible slots to check (worst case: one per booked slot + 1)
        const maxAttempts = sortedBookedSlots.length + 1;
        let attempts = 0;

        while (attempts < maxAttempts) {
            let candidateEndTime = ReflowService.addWorkingMinutes(workCenter, candidateStartTime, durationMinutes);
            let overlaps = false;
            for (const interval of sortedBookedSlots) {
                if (Interval.fromDateTimes(candidateStartTime, candidateEndTime).overlaps(interval)) {
                    overlaps = true;
                    candidateStartTime = ReflowService.nextAvailableMoment(workCenter, interval.end!);
                    break;
                }
            }
            if (!overlaps) {
                return Interval.fromDateTimes(candidateStartTime, candidateEndTime);
            }
            attempts++;
        }

        // If no slot found, throw an error or return undefined/null as preferred.
        throw new Error("No free slot available that fits the requested duration.");
    }

    static sortBookedSlots(bookedSlots: Interval[]): Interval[] {
        return bookedSlots.sort((a, b) => a.start!.diff(b.start!).toMillis());
    }

    static populateWorkCenters(workCenters: WorkCenterDocument[]): Map<string, WorkCenterData> {
        const workCenterMap = new Map<string, WorkCenterData>();
        for (const workCenter of workCenters) {
            workCenterMap.set(workCenter.data.name, workCenter.data);
        }
        return workCenterMap;
    }

    static populateWorkOrdersByCenter(workOrders: WorkOrderDocument[]): Map<string, WorkOrderData[]> {
        const workOrdersByCenter = new Map<string, WorkOrderData[]>();
        for (const workOrder of workOrders) {
            workOrdersByCenter.set(workOrder.data.workCenterId, [...(workOrdersByCenter.get(workOrder.data.workCenterId) || []), workOrder.data]);
        }
        return workOrdersByCenter;
    }

    static generateWhatChanged(changes: ReflowChange[]): string[] {
        return changes.map(change => `${change.workOrderNumber} changed the ${change.changeType} from ${change.oldValue} to ${change.newValue}`);
    }

    static generateExplanation(changes: ReflowChange[]): string[] {
        return changes.map(change => `${change.workOrderNumber} changed the ${change.changeType} from ${change.oldValue} to ${change.newValue} because ${change.reason}`);
    }
}