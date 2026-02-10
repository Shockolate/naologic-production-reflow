import { DateTime } from "luxon";
import { ReflowService } from "./reflow.service";
import { workCenter } from "./fixtures";

describe(ReflowService.name, () => {
    let service: ReflowService;

    beforeEach(() => {
        service = new ReflowService();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("IsInShift", () => {
        it("should return true if the date time is in the shift", () => {
            const wc = workCenter("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }]);
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10 });
            expect(ReflowService.IsInShift(wc, dateTime)).toBe(true);
        });

        it("should return false if the date time is outside of the shift by weekday", () => {
            const wc = workCenter("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }]);
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 6, hour: 10 });
            expect(ReflowService.IsInShift(wc, dateTime)).toBe(false);
        });

        it("should return false if the date time is outside of the shift by hour", () => {
            const wc = workCenter("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }]);
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 18 });
            expect(ReflowService.IsInShift(wc, dateTime)).toBe(false);
        });
    });

    describe("IsInMaintenanceWindow", () => {
        it("should return true if the date time is within a maintenance window", () => {
            const wc = workCenter(
                "WC-001", 
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [{
                    startDate: "2026-01-05T09:00:00Z",
                    endDate: "2026-01-05T11:00:00Z"
                }]
            );
            const dateTime = DateTime.fromISO("2026-01-05T10:00:00Z");
            expect(ReflowService.IsInMaintenanceWindow(wc, dateTime)).toBe(true);
        });

        it("should return false if the date time is before the maintenance window", () => {
            const wc = workCenter(
                "WC-001", 
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [{
                    startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0, millisecond: 0 }).toISO() || "",
                    endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0, millisecond: 0 }).toISO() || ""
                }]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 59, second: 59, millisecond: 0 });
            expect(ReflowService.IsInMaintenanceWindow(wc, dateTime)).toBe(false);
        });

        it("should return false if the date time is after the maintenance window", () => {
            const wc = workCenter(
                "WC-001", 
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [{
                    startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0, millisecond: 0 }).toISO() || "",
                    endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0, millisecond: 0 }).toISO() || ""
                }]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 1, millisecond: 0 });
            expect(ReflowService.IsInMaintenanceWindow(wc, dateTime)).toBe(false);
        });

        it("should return false if there are no maintenance windows", () => {
            const wc = workCenter(
                "WC-001", 
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                []
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0, millisecond: 0 });
            expect(ReflowService.IsInMaintenanceWindow(wc, dateTime)).toBe(false);
        });

        it("should return true if the date time is on the edge (startDate)", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [{
                    startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0, millisecond: 0 }).toISO() || "",
                    endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0, millisecond: 0 }).toISO() || ""
                }]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0, millisecond: 0 });
            expect(ReflowService.IsInMaintenanceWindow(wc, dateTime)).toBe(true);
        });

        it("should return false if the date time is on the edge (endDate)", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [{
                    startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0, millisecond: 0 }).toISO() || "",
                    endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0, millisecond: 0 }).toISO() || ""
                }]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0, millisecond: 0 });
            expect(ReflowService.IsInMaintenanceWindow(wc, dateTime)).toBe(false);
        });

        it("should return true for any window if multiple maintenance windows exist and date is in one", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 7, minute: 0, second: 0, millisecond: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0, millisecond: 0 }).toISO() || ""
                    },
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0, millisecond: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0, millisecond: 0 }).toISO() || ""
                    }
                ]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0, millisecond: 0 });
            expect(ReflowService.IsInMaintenanceWindow(wc, dateTime)).toBe(true);
        });

        it("should return false if date is outside all maintenance windows", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 7, minute: 0, second: 0, millisecond: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0, millisecond: 0 }).toISO() || ""
                    },
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0, millisecond: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0, millisecond: 0 }).toISO() || ""
                    }
                ]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 12, minute: 0, second: 0, millisecond: 0 });
            expect(ReflowService.IsInMaintenanceWindow(wc, dateTime)).toBe(false);
        });
    });
    
    describe("nextAvailableMoment", () => {
        it("should return the same time if already available (simple in-shift, no maintenance)", () => {
            const wc = workCenter(
                "WC-001",
                [
                    { dayOfWeek: 1, startHour: 8, endHour: 17 },
                ],
                []
            );
            // Monday at 9:00 in shift
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0, millisecond: 0 });
            // Should not move since it's available
            const next = ReflowService.nextAvailableMoment(wc, dateTime);
            expect(next.toISO()).toBe(dateTime.toISO());
        });

        it("should skip to next shift if time is before available shift", () => {
            const wc = workCenter(
                "WC-001",
                [
                    { dayOfWeek: 1, startHour: 8, endHour: 17 },
                ],
                []
            );
            // Monday at 7:00, before shift
            const input = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 7, minute: 0, second: 0, millisecond: 0 });
            // Next available is Monday 8:00
            const expected = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0, millisecond: 0 });
            const result = ReflowService.nextAvailableMoment(wc, input);
            expect(result.toISO()).toBe(expected.toISO());
        });

        it("should skip to next shift if time is after shift ends", () => {
            const wc = workCenter(
                "WC-001",
                [
                    { dayOfWeek: 1, startHour: 8, endHour: 17 },
                ],
                []
            );
            // Monday at 18:00 (after shift ends at 17:00)
            const input = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 18, minute: 0, second: 0, millisecond: 0 });
            // Next available is next Monday 8:00, but let's add Tuesday shift for a realistic follow-up
            wc.shifts.push({ dayOfWeek: 2, startHour: 8, endHour: 17 });
            // Next is Tuesday 8:00
            const expected = DateTime.fromObject({ year: 2026, month: 1, day: 6, hour: 8, minute: 0, second: 0, millisecond: 0 });
            const result = ReflowService.nextAvailableMoment(wc, input);
            expect(result.toISO()).toBe(expected.toISO());
        });

        it("should skip over maintenance window if in-shift but under maintenance", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0, millisecond: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 12, minute: 0, second: 0, millisecond: 0 }).toISO() || ""
                    }
                ]
            );
            // Monday at 10:30, during shift, but under maintenance
            const input = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 30, second: 0, millisecond: 0 });
            // Expected: Monday 12:00 (end of maintenance, still in shift)
            const expected = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 12, minute: 0, second: 0, millisecond: 0 });
            const result = ReflowService.nextAvailableMoment(wc, input);
            expect(result.toISO()).toBe(expected.toISO());
        });

        it("should find the next available time after maintenance and shifts", () => {
            const wc = workCenter(
                "WC-001",
                [
                    { dayOfWeek: 1, startHour: 8, endHour: 17 },
                    { dayOfWeek: 2, startHour: 8, endHour: 10 },
                ],
                [
                    // Big maintenance across Monday and into Tuesday shift
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 13, minute: 0, second: 0, millisecond: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 6, hour: 8, minute: 30, second: 0, millisecond: 0 }).toISO() || ""
                    }
                ]
            );
            // Monday 14:00, so in maintenance
            const input = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 14, minute: 0, second: 0, millisecond: 0 });
            // Next available is Tuesday 08:30, but must also be in shift (Tuesday's shift is 8-10)
            // So, should land at 8:30, which is in Tuesday's shift
            const expected = DateTime.fromObject({ year: 2026, month: 1, day: 6, hour: 8, minute: 30, second: 0, millisecond: 0 });
            const result = ReflowService.nextAvailableMoment(wc, input);
            expect(result.toISO()).toBe(expected.toISO());
        });

        it("should jump to the next shift week if multiple days are unavailable", () => {
            const wc = workCenter(
                "WC-001",
                [
                    // Only shift: Monday 8:00-12:00
                    { dayOfWeek: 1, startHour: 8, endHour: 12 },
                ],
                []
            );
            // Monday at 13:00 (after shift ends)
            const input = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 13, minute: 0, second: 0, millisecond: 0 });
            // Next available: next Monday at 8:00
            const expected = DateTime.fromObject({ year: 2026, month: 1, day: 12, hour: 8, minute: 0, second: 0, millisecond: 0 });
            const result = ReflowService.nextAvailableMoment(wc, input);
            expect(result.toISO()).toBe(expected.toISO());
        });
    });
});
