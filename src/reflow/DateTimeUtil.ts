import { DateTime } from "luxon";

export class DateTimeUtil {
    static FromDateTimeWeekday(dateTime: DateTime): number {
        if (dateTime.weekday === 7) {
            return 0;
        }
        return dateTime.weekday;
    }
}