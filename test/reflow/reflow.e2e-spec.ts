import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ReflowModule } from '../../src/reflow/reflow.module';
import testCase1 from './test-case1.json';

describe('ReflowController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ReflowModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('/reflow', () => {
    it('should return 201 when the empty request is valid', () => {
      return request(app.getHttpServer())
        .post('/reflow')
        .send({
          documents: [],
        })
        .expect(201);
    });

    it('should reflow a simple test case (1)', async () => {
      const response = await request(app.getHttpServer())
        .post('/reflow')
        .send(testCase1)
        .expect(201);

      expect(response.body).toEqual({
        updatedWorkOrders: [
          {
            workOrderNumber: 'WO-001',
            manufacturingOrderId: 'MO-1',
            workCenterId: 'Assembly A',
            startDate: '2025-02-10T08:00:00Z',
            endDate: '2025-02-10T12:00:00Z',
            durationMinutes: 240,
            isMaintenance: false,
            dependsOnWorkOrderIds: [],
          },
        ],
      });
    });
  });
});
