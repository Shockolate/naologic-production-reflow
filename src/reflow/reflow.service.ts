import { Injectable } from "@nestjs/common";
import { ReflowDocument, WorkOrderDocument, WorkCenterDocument, ManufacturingOrderDocument, ReflowResult, WorkCenterData } from "./types";
import { WorkflowBuilderService } from "./workflow-builder.service";
import { DateTime, Interval} from "luxon";
import { DateTimeUtil } from "./DateTimeUtil";

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

    /** Check if the date time is in a shift */
    static IsInShift(workCenter: WorkCenterData, dateTime: DateTime): boolean {
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
    static IsInMaintenanceWindow(workCenter: WorkCenterData, dateTime: DateTime): boolean {
        for (const maintenanceWindow of workCenter.maintenanceWindows) {
            if (dateTime >= DateTime.fromISO(maintenanceWindow.startDate) && dateTime < DateTime.fromISO(maintenanceWindow.endDate)) {
                return true;
            }
        }
        return false;
    }

    /** Check if the work center is available at the given date time */
    static IsAvailable(workCenter: WorkCenterData, dateTime: DateTime): boolean {
        return ReflowService.IsInShift(workCenter, dateTime) && !ReflowService.IsInMaintenanceWindow(workCenter, dateTime);
    }

    /** Find the next time where the work center is available */
    static nextAvailableMoment(workCenter: WorkCenterData, dateTime: DateTime): DateTime {
        let candidateDateTime = dateTime;
        while (!ReflowService.IsAvailable(workCenter, candidateDateTime)) {
            candidateDateTime = candidateDateTime.plus({ minutes: 1 });
        }
        return candidateDateTime;
    }


    static addWorkingMinutes(workCenter: WorkCenterData, timeStart: DateTime, durationMinutes: number): DateTime {
        let remainingMinutes = durationMinutes;
        let currentTime = timeStart;
        while (remainingMinutes > 0) {
            if (!ReflowService.IsAvailable(workCenter, currentTime)) {
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

}