import { IsNumber, IsString, Min } from "class-validator";

export class ManufacturingOrderDataDto {
    @IsString()
    manufacturingOrderNumber!: string;

    @IsString()
    itemId!: string;

    @IsNumber()
    @Min(0)
    quantity!: number;

    @IsString()
    dueDate!: string;
}
