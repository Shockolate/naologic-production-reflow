import { DirectedGraph } from 'graphology';
import hasCycle from 'graphology-dag/has-cycle';
import { topologicalSort } from 'graphology-dag/topological-sort';
import { WorkflowBuilderService } from './workflow-builder.service';
import { workOrder } from './fixtures';

describe(WorkflowBuilderService.name, () => {
  let service: WorkflowBuilderService;

  beforeEach(() => {
    service = new WorkflowBuilderService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('valid DAGs', () => {
    it('should build an empty graph when given no work orders', () => {
      const graph = service.buildWorkflow([]);
      expect(graph).toBeDefined();
      expect(graph.order).toBe(0);
      expect(graph.size).toBe(0);
    });

    it('should build a single-node graph for one work order with no dependencies', () => {
      const orders = [workOrder('WO-001')];
      const graph = service.buildWorkflow(orders);
      expect(graph.order).toBe(1);
      expect(graph.size).toBe(0);
      expect(graph.hasNode('WO-001')).toBe(true);
      expect(graph.getNodeAttributes('WO-001').workOrder).toEqual(orders[0]);
      expect(hasCycle(graph)).toBe(false);
      expect(topologicalSort(graph)).toEqual(['WO-001']);
    });

    it('should build a two-node DAG with one dependency (A → B)', () => {
      const orders = [workOrder('A'), workOrder('B', ['A'])];
      const graph = service.buildWorkflow(orders);
      expect(graph.order).toBe(2);
      expect(graph.size).toBe(1);
      expect(graph.hasEdge('A', 'B')).toBe(true);
      expect(graph.outNeighbors('A')).toContain('B');
      expect(graph.inNeighbors('B')).toContain('A');
      expect(hasCycle(graph)).toBe(false);
      const sorted = topologicalSort(graph);
      expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('B'));
    });

    it('should build a chain DAG (A → B → C)', () => {
      const orders = [
        workOrder('A'),
        workOrder('B', ['A']),
        workOrder('C', ['B']),
      ];
      const graph = service.buildWorkflow(orders);
      expect(graph.order).toBe(3);
      expect(graph.size).toBe(2);
      expect(graph.hasEdge('A', 'B')).toBe(true);
      expect(graph.hasEdge('B', 'C')).toBe(true);
      expect(hasCycle(graph)).toBe(false);
      const sorted = topologicalSort(graph);
      expect(sorted).toEqual(['A', 'B', 'C']);
    });

    it('should build a diamond DAG (A → B, A → C, B → D, C → D)', () => {
      const orders = [
        workOrder('A'),
        workOrder('B', ['A']),
        workOrder('C', ['A']),
        workOrder('D', ['B', 'C']),
      ];
      const graph = service.buildWorkflow(orders);
      expect(graph.order).toBe(4);
      expect(graph.size).toBe(4);
      expect(graph.hasEdge('A', 'B')).toBe(true);
      expect(graph.hasEdge('A', 'C')).toBe(true);
      expect(graph.hasEdge('B', 'D')).toBe(true);
      expect(graph.hasEdge('C', 'D')).toBe(true);
      expect(hasCycle(graph)).toBe(false);
      const sorted = topologicalSort(graph);
      expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('B'));
      expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('C'));
      expect(sorted.indexOf('B')).toBeLessThan(sorted.indexOf('D'));
      expect(sorted.indexOf('C')).toBeLessThan(sorted.indexOf('D'));
    });

    it('should build a DAG with multiple roots and one child (D depends on A, B, C)', () => {
      const orders = [
        workOrder('A'),
        workOrder('B'),
        workOrder('C'),
        workOrder('D', ['A', 'B', 'C']),
      ];
      const graph = service.buildWorkflow(orders);
      expect(graph.order).toBe(4);
      expect(graph.size).toBe(3);
      expect(graph.inDegree('D')).toBe(3);
      expect(graph.outNeighbors('A')).toContain('D');
      expect(graph.outNeighbors('B')).toContain('D');
      expect(graph.outNeighbors('C')).toContain('D');
      expect(hasCycle(graph)).toBe(false);
      const sorted = topologicalSort(graph);
      expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('D'));
      expect(sorted.indexOf('B')).toBeLessThan(sorted.indexOf('D'));
      expect(sorted.indexOf('C')).toBeLessThan(sorted.indexOf('D'));
    });

    it('should build a forest (disconnected components) as a valid DAG', () => {
      const orders = [
        workOrder('A'),
        workOrder('B', ['A']),
        workOrder('C'),
        workOrder('D', ['C']),
      ];
      const graph = service.buildWorkflow(orders);
      expect(graph.order).toBe(4);
      expect(graph.size).toBe(2);
      expect(graph.hasEdge('A', 'B')).toBe(true);
      expect(graph.hasEdge('C', 'D')).toBe(true);
      expect(hasCycle(graph)).toBe(false);
      const sorted = topologicalSort(graph);
      expect(sorted).toHaveLength(4);
      expect(sorted).toContain('A');
      expect(sorted).toContain('B');
      expect(sorted).toContain('C');
      expect(sorted).toContain('D');
    });

    it('should preserve full work order data on each node', () => {
      const wo = workOrder('WO-123', [], {
        manufacturingOrderId: 'MO-456',
        workCenterId: 'WC-789',
        durationMinutes: 60,
        isMaintenance: true,
      });
      const graph = service.buildWorkflow([wo]);
      const attrs = graph.getNodeAttributes('WO-123');
      expect(attrs.workOrder).toEqual(wo);
      expect(attrs.workOrder.workOrderNumber).toBe('WO-123');
      expect(attrs.workOrder.manufacturingOrderId).toBe('MO-456');
      expect(attrs.workOrder.isMaintenance).toBe(true);
    });
  });

  describe('invalid DAGs and edge cases', () => {
    it('should throw when a work order depends on a non-existent work order', () => {
      const orders = [workOrder('A', ['MISSING-WO'])];
      expect(() => service.buildWorkflow(orders)).toThrow(/not found|unknown/);
    });

    it('should throw when multiple work orders reference missing dependencies', () => {
      const orders = [workOrder('A'), workOrder('B', ['A', 'GHOST'])];
      expect(() => service.buildWorkflow(orders)).toThrow();
    });

    it('should throw when dependency forms a cycle and referenced node is not yet in graph (A→B→C→A in order A,B,C)', () => {
      const orders = [
        workOrder('A', ['C']),
        workOrder('B', ['A']),
        workOrder('C', ['B']),
      ];
      expect(() => service.buildWorkflow(orders)).toThrow(/not found|unknown/);
    });

    it('should throw when work order depends on itself (self-loop) because topologicalSort rejects cycles', () => {
      const orders = [workOrder('A', ['A'])];
      expect(() => service.buildWorkflow(orders)).toThrow(
        /WorkOrder A will create a cycle with A/,
      );
    });

    it('should throw when duplicate work order numbers exist in the input', () => {
      const orders = [
        workOrder('WO-1', [], { durationMinutes: 10 }),
        workOrder('WO-1', ['WO-2'], { durationMinutes: 20 }),
        workOrder('WO-2'),
      ];
      expect(() => service.buildWorkflow(orders)).toThrow(/already exist/);
    });
  });

  describe('graph type and structure', () => {
    it('should return a DirectedGraph instance', () => {
      const graph = service.buildWorkflow([workOrder('X')]);
      expect(graph).toBeInstanceOf(DirectedGraph);
    });

    it('should create edges in correct direction (parent → child)', () => {
      const orders = [workOrder('PARENT'), workOrder('CHILD', ['PARENT'])];
      const graph = service.buildWorkflow(orders);
      expect(graph.hasEdge('PARENT', 'CHILD')).toBe(true);
      expect(graph.hasEdge('CHILD', 'PARENT')).toBe(false);
      expect(graph.inNeighbors('CHILD')).toEqual(['PARENT']);
      expect(graph.outNeighbors('PARENT')).toEqual(['CHILD']);
    });

    it('should handle work orders with many dependencies', () => {
      const deps = ['A', 'B', 'C', 'D', 'E'];
      const orders = [
        workOrder('A'),
        workOrder('B'),
        workOrder('C'),
        workOrder('D'),
        workOrder('E'),
        workOrder('F', deps),
      ];
      const graph = service.buildWorkflow(orders);
      expect(graph.inDegree('F')).toBe(5);
      expect(graph.outDegree('A')).toBe(1);
      for (const d of deps) {
        expect(graph.hasEdge(d, 'F')).toBe(true);
      }
    });
  });
});
