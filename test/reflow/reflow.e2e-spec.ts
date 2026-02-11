import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ReflowModule } from '../../src/reflow/reflow.module';
import testCase1 from './test-case1.json';
import testCase2 from './test-case2.json';
import { WorkOrderData } from 'src/reflow/types';

type ReflowResultDto = {
    updatedWorkOrders: WorkOrderData[];
    changes: string[];
    explanation: string[];
};

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

            const responseBody = response.body as ReflowResultDto;

            expect(responseBody.updatedWorkOrders).toHaveLength(1);
            expect(responseBody.changes).toHaveLength(0);
            expect(responseBody.explanation).toHaveLength(0);
        });

        it('should reflow a complex test case (2)', async () => {
            const response = await request(app.getHttpServer())
                .post('/reflow')
                .send(testCase2)
                .expect(201);

            const responseBody = response.body as ReflowResultDto;

            expect(responseBody.updatedWorkOrders).toHaveLength(15);
            expect(responseBody.changes).toHaveLength(12);
            expect(responseBody.explanation).toHaveLength(12);
        });
    });
});
