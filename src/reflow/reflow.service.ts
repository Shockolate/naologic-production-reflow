import { Injectable } from "@nestjs/common";
import { ReflowDocument, WorkOrderDocument, WorkCenterDocument, ManufacturingOrderDocument, ReflowResult, WorkCenterData } from "./types";
import { WorkflowBuilderService } from "./workflow-builder.service";
import { DateTime } from "luxon";
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

    static IsInMaintenanceWindow(workCenter: WorkCenterData, dateTime: DateTime): boolean {
        for (const maintenanceWindow of workCenter.maintenanceWindows) {
            if (dateTime >= DateTime.fromISO(maintenanceWindow.startDate) && dateTime < DateTime.fromISO(maintenanceWindow.endDate)) {
                return true;
            }
        }
        return false;
    }

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
}