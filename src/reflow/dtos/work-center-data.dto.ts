import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

export class WorkCenterShiftDto {
    @IsNumber()
    @Min(0)
    @Max(6)
    dayOfWeek!: number;

    @IsNumber()
    @Min(0)
    @Max(23)
    startHour!: number;

    @IsNumber()
    @Min(0)
    @Max(23)
    endHour!: number;
}

export class WorkCenterMaintenanceWindowDto {
    @IsString()
    startDate!: string;

    @IsString()
    endDate!: string;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class WorkCenterDataDto {
    @IsString()
    name!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkCenterShiftDto)
    shifts!: WorkCenterShiftDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkCenterMaintenanceWindowDto)
    maintenanceWindows!: WorkCenterMaintenanceWindowDto[];
}
