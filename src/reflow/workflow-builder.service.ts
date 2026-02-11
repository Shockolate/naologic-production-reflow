import { Injectable } from "@nestjs/common";
import { DirectedGraph } from "graphology";
import { WorkOrderData } from "./types";
import hasCycle from "graphology-dag/has-cycle";
import { topologicalSort } from "graphology-dag/topological-sort";
import willCreateCycle from 'graphology-dag/will-create-cycle';


@Injectable()
export class WorkflowBuilderService {
    buildWorkflow(workOrders: WorkOrderData[]): DirectedGraph<{ workOrder: WorkOrderData }> {
        const graph = new DirectedGraph<{ workOrder: WorkOrderData }>();

        for (const workOrder of workOrders) {
            graph.addNode(workOrder.workOrderNumber, {
                workOrder
            });

            for (const dependsOnWorkOrderId of workOrder.dependsOnWorkOrderIds) {
                if (willCreateCycle(graph, dependsOnWorkOrderId, workOrder.workOrderNumber)) {
                    throw new Error(`WorkOrder ${workOrder.workOrderNumber} will create a cycle with ${dependsOnWorkOrderId}.`);
                }
                graph.addEdge(dependsOnWorkOrderId, workOrder.workOrderNumber);
            }
        }

        if (hasCycle(graph)) {
            throw new Error("Cannot build the Workflow. The graph has cycles")
        }
        return graph;
    }

    getSortedWorkOrderNumbers(graph: DirectedGraph<{ workOrder: WorkOrderData }>): string[] {
        return topologicalSort(graph);
    }
    
}