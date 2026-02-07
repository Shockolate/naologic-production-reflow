import { Controller } from "@nestjs/common";
import { ReflowService } from "./reflow.service";

@Controller("reflow")
export class ReflowController {
    constructor(private readonly reflowService: ReflowService) {}
}