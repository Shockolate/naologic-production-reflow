import { DateTime, Interval } from "luxon";
import { ReflowService } from "./reflow.service";
import { ReflowServiceInput } from "./types";
import { workCenter, workCenterDocument, workOrderDocument } from "./fixtures";
import { Test } from "@nestjs/testing";
import { WorkflowBuilderService } from "./workflow-builder.service";

describe(ReflowService.name, () => {
    let service: ReflowService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [ReflowService, WorkflowBuilderService],
        }).compile();

        service = moduleRef.get<ReflowService>(ReflowService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("isInShift", () => {
        it("should return true if the date time is in the shift", () => {
            const wc = workCenter("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }]);
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10 });
            expect(ReflowService.isInShift(wc, dateTime)).toBe(true);
        });

        it("should return false if the date time is outside of the shift by weekday", () => {
            const wc = workCenter("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }]);
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 6, hour: 10 });
            expect(ReflowService.isInShift(wc, dateTime)).toBe(false);
        });

        it("should return false if the date time is outside of the shift by hour", () => {
            const wc = workCenter("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }]);
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 18 });
            expect(ReflowService.isInShift(wc, dateTime)).toBe(false);
        });
    });

    describe("isInMaintenanceWindow", () => {
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
            expect(ReflowService.isInMaintenanceWindow(wc, dateTime)).toBe(true);
        });

        it("should return false if the date time is before the maintenance window", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [{
                    startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "",
                    endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 }).toISO() || ""
                }]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 59, second: 59 });
            expect(ReflowService.isInMaintenanceWindow(wc, dateTime)).toBe(false);
        });

        it("should return false if the date time is after the maintenance window", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [{
                    startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "",
                    endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 }).toISO() || ""
                }]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 1 });
            expect(ReflowService.isInMaintenanceWindow(wc, dateTime)).toBe(false);
        });

        it("should return false if there are no maintenance windows", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                []
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 });
            expect(ReflowService.isInMaintenanceWindow(wc, dateTime)).toBe(false);
        });

        it("should return true if the date time is on the edge (startDate)", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [{
                    startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "",
                    endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 }).toISO() || ""
                }]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 });
            expect(ReflowService.isInMaintenanceWindow(wc, dateTime)).toBe(true);
        });

        it("should return false if the date time is on the edge (endDate)", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [{
                    startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "",
                    endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 }).toISO() || ""
                }]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 });
            expect(ReflowService.isInMaintenanceWindow(wc, dateTime)).toBe(false);
        });

        it("should return true for any window if multiple maintenance windows exist and date is in one", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 7, minute: 0, second: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0 }).toISO() || ""
                    },
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 }).toISO() || ""
                    }
                ]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 });
            expect(ReflowService.isInMaintenanceWindow(wc, dateTime)).toBe(true);
        });

        it("should return false if date is outside all maintenance windows", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 7, minute: 0, second: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0 }).toISO() || ""
                    },
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 }).toISO() || ""
                    }
                ]
            );
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 12, minute: 0, second: 0 });
            expect(ReflowService.isInMaintenanceWindow(wc, dateTime)).toBe(false);
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
            const dateTime = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 });
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
            const input = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 7, minute: 0, second: 0 });
            // Next available is Monday 8:00
            const expected = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0 });
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
            const input = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 18, minute: 0, second: 0 });
            // Next available is next Monday 8:00, but let's add Tuesday shift for a realistic follow-up
            wc.shifts.push({ dayOfWeek: 2, startHour: 8, endHour: 17 });
            // Next is Tuesday 8:00
            const expected = DateTime.fromObject({ year: 2026, month: 1, day: 6, hour: 8, minute: 0, second: 0 });
            const result = ReflowService.nextAvailableMoment(wc, input);
            expect(result.toISO()).toBe(expected.toISO());
        });

        it("should skip over maintenance window if in-shift but under maintenance", () => {
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [
                    {
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 12, minute: 0, second: 0 }).toISO() || ""
                    }
                ]
            );
            // Monday at 10:30, during shift, but under maintenance
            const input = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 30, second: 0 });
            // Expected: Monday 12:00 (end of maintenance, still in shift)
            const expected = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 12, minute: 0, second: 0 });
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
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 13, minute: 0, second: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 6, hour: 8, minute: 30, second: 0 }).toISO() || ""
                    }
                ]
            );
            // Monday 14:00, so in maintenance
            const input = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 14, minute: 0, second: 0 });
            // Next available is Tuesday 08:30, but must also be in shift (Tuesday's shift is 8-10)
            // So, should land at 8:30, which is in Tuesday's shift
            const expected = DateTime.fromObject({ year: 2026, month: 1, day: 6, hour: 8, minute: 30, second: 0 });
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
            const input = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 13, minute: 0, second: 0 });
            // Next available: next Monday at 8:00
            const expected = DateTime.fromObject({ year: 2026, month: 1, day: 12, hour: 8, minute: 0, second: 0 });
            const result = ReflowService.nextAvailableMoment(wc, input);
            expect(result.toISO()).toBe(expected.toISO());
        });
    });

    describe("sortBookedSlots", () => {
        it("should sort the booked slots by start time", () => {
            const bookedSlots = [
                Interval.fromDateTimes(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }), DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 12, minute: 0, second: 0 })),
                Interval.fromDateTimes(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 }), DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 13, minute: 0, second: 0 })),
            ];
            expect(ReflowService.sortBookedSlots(bookedSlots)).toEqual(bookedSlots.sort((a, b) => a.start!.diff(b.start!).toMillis()));
        });

        it("should sort the booked slots by end time", () => {
            const bookedSlots = [
                Interval.fromDateTimes(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }), DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 12, minute: 0, second: 0 })),
                Interval.fromDateTimes(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 }), DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 13, minute: 0, second: 0 })),
            ];
            expect(ReflowService.sortBookedSlots(bookedSlots)).toEqual(bookedSlots.sort((a, b) => a.end!.diff(b.end!).toMillis()));
        });
    });

    describe("firstFreeSlot", () => {
        it("should find the slot after all existing bookings", () => {
            // Work center has a shift on Monday, 8:00-17:00
            const wc = workCenter("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }], []);
            const start = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0 });
            // Booked: 8:00-10:00, 10:00-11:00 (so, free from 11:00)
            const bookedSlots = [
                Interval.fromDateTimes(start, start.plus({ hours: 2 })),
                Interval.fromDateTimes(start.plus({ hours: 2 }), start.plus({ hours: 3 })),
            ];
            const duration = 60; // 60 mins
            const result = ReflowService.firstFreeSlot(wc, bookedSlots, start, duration);
            expect(result.start!.toISO()).toBe(start.plus({ hours: 3 }).toISO());
            expect(result.end!.toISO()).toBe(start.plus({ hours: 4 }).toISO());
        });

        it("should find slot between two bookings", () => {
            const wc = workCenter("WC-001", [{ dayOfWeek: 2, startHour: 8, endHour: 17 }], []);
            const day = DateTime.fromObject({ year: 2026, month: 1, day: 6, hour: 8, minute: 0, second: 0 });
            // Slot: 8:00–10:00, 12:00–14:00; search for 2 hour slot, earliest 10:00
            const bookedSlots = [
                Interval.fromDateTimes(day, day.plus({ hours: 2 })),
                Interval.fromDateTimes(day.plus({ hours: 4 }), day.plus({ hours: 6 })),
            ];
            const duration = 120;
            const earliest = day.plus({ hours: 2 });
            const result = ReflowService.firstFreeSlot(wc, bookedSlots, earliest, duration);
            expect(result.start!.toISO()).toBe(day.plus({ hours: 2 }).toISO());
            expect(result.end!.toISO()).toBe(day.plus({ hours: 4 }).toISO());
        });

        it("should skip to the next week if no slot is available today", () => {
            // Monday: 8:00–9:00, 9:00–17:00 booked (full day booked)
            const wc = workCenter("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }], []);
            const day = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0 });
            const bookedSlots = [
                Interval.fromDateTimes(day, day.plus({ hours: 1 })),
                Interval.fromDateTimes(day.plus({ hours: 1 }), day.plus({ hours: 9 })),
            ];
            const duration = 60;
            // Next Monday at 8:00 should be available
            const expectedStart = day.plus({ days: 7 }); // next Monday, 8:00
            const result = ReflowService.firstFreeSlot(wc, bookedSlots, day, duration);
            expect(result.start!.toISO()).toBe(expectedStart.toISO());
            expect(result.end!.toISO()).toBe(expectedStart.plus({ minutes: 60 }).toISO());
        });

        it("should ignore maintenance windows when computing slots (because they are not in slots but checked via availability)", () => {
            // Shift is Monday 8:00–17:00, but maintenance from 9:00–10:00
            const wc = workCenter(
                "WC-001",
                [{ dayOfWeek: 1, startHour: 8, endHour: 17 }],
                [{ startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "", endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }).toISO() || "" }]
            );
            const day = DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0 });
            const bookedSlots: Interval[] = [];
            // Try to book 120 minutes from 8:00 (should skip 9-10 maintenance)
            const result = ReflowService.firstFreeSlot(wc, bookedSlots, day, 120);
            // It will start at 8:00, occupy 8:00-9:00, then 'pause' 9:00-10:00, resume 10:00-11:00
            // so the end should be at 11:00
            expect(result.start!.toISO()).toBe(day.toISO());
            expect(result.end!.toISO()).toBe(day.plus({ hours: 3 }).toISO());
        });
    });

    describe("reflow", () => {
        it("should not throw and return a result structure when given empty input", () => {
            const input: ReflowServiceInput = {
                workOrders: [],
                workCenters: [],
                manufacturingOrders: [],
            };
            expect(() => service.reflow(input)).not.toThrow();
            const result = service.reflow(input);
            expect(result).toHaveProperty("updatedWorkOrders");
            expect(result).toHaveProperty("changes");
            expect(result).toHaveProperty("explanation");
        });

        it("should assign a simple work order with available slot", () => {
            const workOrders = [
                workOrderDocument("WO-1", [], { startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0 }).toISO() || "", endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 17, minute: 0, second: 0 }).toISO() || "", durationMinutes: 120 }),
            ];
            const workCenters = [
                workCenterDocument("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }])
            ];
            const input: ReflowServiceInput = {
                workOrders,
                workCenters,
                manufacturingOrders: [],
            };
            expect(() => service.reflow(input)).not.toThrow();
            const result = service.reflow(input);
            expect(result).toHaveProperty("updatedWorkOrders");
            expect(result.changes).toHaveLength(0);
            expect(result.explanation).toHaveLength(0);
        });

        it("should throw if workOrder refers to unknown workCenter", () => {
            const workOrders = [
                workOrderDocument("WO-1", [], { workCenterId: "NON-EXISTENT" })
            ];
            const workCenters = [
                workCenterDocument("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }])
            ];
            const input: ReflowServiceInput = {
                workOrders,
                workCenters,
                manufacturingOrders: [],
            };
            expect(() => service.reflow(input)).toThrow(/Work center NON-EXISTENT not found/);
        });

        it("should process work orders with dependency (topological order)", () => {
            const workOrders = [
                workOrderDocument("WO-1", [], { startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0 }).toISO() || "", endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "", durationMinutes: 60 }),
                workOrderDocument("WO-2", ["WO-1"], { startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "", endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }).toISO() || "", durationMinutes: 120 }),
            ];
            const workCenters = [
                workCenterDocument("WC-001", [{ dayOfWeek: 1, startHour: 8, endHour: 17 }])
            ];
            const input: ReflowServiceInput = {
                workOrders,
                workCenters,
                manufacturingOrders: [],
            };
            expect(() => service.reflow(input)).not.toThrow();
            const result = service.reflow(input);
            expect(result).toHaveProperty("updatedWorkOrders");
            expect(result.changes).toHaveLength(0);
            expect(result.explanation).toHaveLength(0);
        });

        it("should handle overlapping work orders on the same work center", () => {
            // Both work orders target the same work center and have overlapping time windows.
            const workOrders = [
                workOrderDocument(
                    "WO-1",
                    [],
                    {
                        workCenterId: "WC-001",
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }).toISO() || "",
                        durationMinutes: 120,
                    }
                ),
                workOrderDocument(
                    "WO-2",
                    [],
                    {
                        workCenterId: "WC-001",
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 }).toISO() || "",
                        durationMinutes: 120,
                    }
                ),
            ];
            const workCenters = [
                workCenterDocument(
                    "WC-001",
                    [
                        { dayOfWeek: 1, startHour: 8, endHour: 17 }
                    ]
                ),
            ];
            const input: ReflowServiceInput = {
                workOrders,
                workCenters,
                manufacturingOrders: [],
            };
            const result = service.reflow(input);
            expect(result).toHaveProperty("updatedWorkOrders");
            expect(result.updatedWorkOrders).toHaveLength(2);
            expect(result.updatedWorkOrders[0].workOrderNumber).toBe("WO-1");
            expect(DateTime.fromISO(result.updatedWorkOrders[0].startDate).equals(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0 }))).toBe(true);
            expect(DateTime.fromISO(result.updatedWorkOrders[0].endDate).equals(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }))).toBe(true);
            expect(result.updatedWorkOrders[1].workOrderNumber).toBe("WO-2");
            expect(DateTime.fromISO(result.updatedWorkOrders[1].startDate).equals(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }))).toBe(true);
            expect(DateTime.fromISO(result.updatedWorkOrders[1].endDate).equals(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 12, minute: 0, second: 0 }))).toBe(true);
            expect(result.changes).toHaveLength(1);
            expect(result.explanation).toHaveLength(1);
        });

        it("should handle overlapping work orders on the same work center (in the opposite order)", () => {
            // Both work orders target the same work center and have overlapping time windows.
            const workOrders = [
                workOrderDocument(
                    "WO-1",
                    [],
                    {
                        workCenterId: "WC-001",
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 9, minute: 0, second: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 11, minute: 0, second: 0 }).toISO() || "",
                        durationMinutes: 120,
                    }
                ),
                workOrderDocument(
                    "WO-2",
                    [],
                    {
                        workCenterId: "WC-001",
                        startDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }).toISO() || "",
                        durationMinutes: 120,
                    }
                ),
            ];
            const workCenters = [
                workCenterDocument(
                    "WC-001",
                    [
                        { dayOfWeek: 1, startHour: 8, endHour: 17 }
                    ]
                ),
            ];
            const input: ReflowServiceInput = {
                workOrders,
                workCenters,
                manufacturingOrders: [],
            };
            const result = service.reflow(input);
            expect(result).toHaveProperty("updatedWorkOrders");
            expect(result.updatedWorkOrders).toHaveLength(2);
            expect(result.updatedWorkOrders[0].workOrderNumber).toBe("WO-2");
            expect(DateTime.fromISO(result.updatedWorkOrders[0].startDate).equals(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 8, minute: 0, second: 0 }))).toBe(true);
            expect(DateTime.fromISO(result.updatedWorkOrders[0].endDate).equals(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }))).toBe(true);
            expect(result.updatedWorkOrders[1].workOrderNumber).toBe("WO-1");
            expect(DateTime.fromISO(result.updatedWorkOrders[1].startDate).equals(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 10, minute: 0, second: 0 }))).toBe(true);
            expect(DateTime.fromISO(result.updatedWorkOrders[1].endDate).equals(DateTime.fromObject({ year: 2026, month: 1, day: 5, hour: 12, minute: 0, second: 0 }))).toBe(true);
            expect(result.changes).toHaveLength(1);
            expect(result.explanation).toHaveLength(1);
        });

        it("should respect maintenance windows on work centers when reflowing work orders", () => {
            const workOrders = [
                workOrderDocument(
                    "WO-1",
                    [],
                    {
                        workCenterId: "WC-MAINT",
                        startDate: DateTime.fromObject({ year: 2030, month: 6, day: 3, hour: 8, minute: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2030, month: 6, day: 3, hour: 9, minute: 0 }).toISO() || "",
                        durationMinutes: 60,
                    }
                ),
                workOrderDocument(
                    "WO-2",
                    [],
                    {
                        workCenterId: "WC-MAINT",
                        startDate: DateTime.fromObject({ year: 2030, month: 6, day: 3, hour: 8, minute: 30 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2030, month: 6, day: 3, hour: 9, minute: 30 }).toISO() || "",
                        durationMinutes: 60,
                    }
                )
            ];
            const workCenters = [
                workCenterDocument(
                    "WC-MAINT",
                    [
                        { dayOfWeek: 1, startHour: 8, endHour: 17 }
                    ],
                    [
                        { // Maintenance from 9:00 to 10:00 on the same day
                            startDate: DateTime.fromObject({ year: 2030, month: 6, day: 3, hour: 9, minute: 0 }).toISO() || "",
                            endDate: DateTime.fromObject({ year: 2030, month: 6, day: 3, hour: 10, minute: 0 }).toISO() || ""
                        }
                    ]
                )
            ];

            const input: ReflowServiceInput = {
                workOrders,
                workCenters,
                manufacturingOrders: [],
            };
            const result = service.reflow(input);
            expect(result.updatedWorkOrders).toHaveLength(2);
            expect(result.changes).toHaveLength(1);
            expect(result.explanation).toHaveLength(1);

            // First WO should be at 8:00-9:00 as it fits before maintenance window
            const wo1 = result.updatedWorkOrders.find(wo => wo.workOrderNumber === "WO-1")!;
            expect(DateTime.fromISO(wo1.startDate).equals(DateTime.fromObject({ year: 2030, month: 6, day: 3, hour: 8 }))).toBe(true);
            expect(DateTime.fromISO(wo1.endDate).equals(DateTime.fromObject({ year: 2030, month: 6, day: 3, hour: 9 }))).toBe(true);

            // Second WO must be placed after maintenance, i.e., starts at 10:00
            const wo2 = result.updatedWorkOrders.find(wo => wo.workOrderNumber === "WO-2")!;
            expect(DateTime.fromISO(wo2.startDate).equals(DateTime.fromObject({ year: 2030, month: 6, day: 3, hour: 10 }))).toBe(true);
            expect(DateTime.fromISO(wo2.endDate).equals(DateTime.fromObject({ year: 2030, month: 6, day: 3, hour: 11 }))).toBe(true);
        });

        it("should not move maintenance work orders, and should move other work orders around them", () => {
            const workOrders = [
                workOrderDocument(
                    "WO-MAINTENANCE",
                    [],
                    {
                        workCenterId: "WC-002",
                        startDate: DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 10, minute: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 11, minute: 0 }).toISO() || "",
                        durationMinutes: 60,
                        isMaintenance: true
                    }
                ),
                workOrderDocument(
                    "WO-A",
                    [],
                    {
                        workCenterId: "WC-002",
                        startDate: DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 9, minute: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 11, minute: 0 }).toISO() || "",
                        durationMinutes: 120,
                    }
                ),
                workOrderDocument(
                    "WO-B",
                    [],
                    {
                        workCenterId: "WC-002",
                        startDate: DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 11, minute: 0 }).toISO() || "",
                        endDate: DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 12, minute: 0 }).toISO() || "",
                        durationMinutes: 60,
                    }
                ),
            ];
            const workCenters = [
                workCenterDocument(
                    "WC-002",
                    [
                        { dayOfWeek: 1, startHour: 8, endHour: 17 }
                    ]
                )
            ];
            const input: ReflowServiceInput = {
                workOrders,
                workCenters,
                manufacturingOrders: [],
            };
            const result = service.reflow(input);
            expect(result.updatedWorkOrders).toHaveLength(3);
            expect(result.changes).toHaveLength(2);
            expect(result.explanation).toHaveLength(2);

            // Maintenance WO should retain its time
            const maint = result.updatedWorkOrders.find(wo => wo.workOrderNumber === "WO-MAINTENANCE")!;
            expect(DateTime.fromISO(maint.startDate).equals(DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 10 }))).toBe(true);
            expect(DateTime.fromISO(maint.endDate).equals(DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 11 }))).toBe(true);
            expect(maint.isMaintenance).toBe(true);

            // WO-A scheduled after maintenance
            const woa = result.updatedWorkOrders.find(wo => wo.workOrderNumber === "WO-A")!;
            expect(DateTime.fromISO(woa.startDate).equals(DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 11 }))).toBe(true);
            expect(DateTime.fromISO(woa.endDate).equals(DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 13 }))).toBe(true);

            // WO-B scheduled after WO-A
            const wob = result.updatedWorkOrders.find(wo => wo.workOrderNumber === "WO-B")!;
            expect(DateTime.fromISO(wob.startDate).equals(DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 13 }))).toBe(true);
            expect(DateTime.fromISO(wob.endDate).equals(DateTime.fromObject({ year: 2031, month: 4, day: 14, hour: 14 }))).toBe(true);
        });
    });
});
