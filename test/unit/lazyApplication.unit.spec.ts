import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express, { type Application } from 'express';
import request from 'supertest';
import { lazyApplication } from '../../src';

const buildApplication = async (): Promise<Application> => {
  await new Promise((resolve) => setTimeout(resolve, 10));

  const app = express();
  app.get('/ping', (_request, response) => {
    response.status(200).send({ pong: true });
  });

  return app;
};

void describe('lazyApplication - unit', () => {
  void it('serves requests once the application is built', async () => {
    const response = await request(lazyApplication(buildApplication())).get(
      '/ping',
    );

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { pong: true });
  });

  void it('serves several requests with the same application', async () => {
    const app = lazyApplication(buildApplication());

    assert.equal((await request(app).get('/ping')).status, 200);
    assert.equal((await request(app).get('/ping')).status, 200);
  });

  void it('forwards the error to the request when the application fails to build', async () => {
    const failing = lazyApplication(Promise.reject(new Error('spec not found')));

    const response = await request(failing).get('/ping');

    assert.equal(response.status, 500);
  });

  void it('does not raise an unhandled rejection when no request arrives', async () => {
    let unhandled = false;
    const onUnhandled = () => {
      unhandled = true;
    };
    process.once('unhandledRejection', onUnhandled);

    lazyApplication(Promise.reject(new Error('never requested')));
    await new Promise((resolve) => setTimeout(resolve, 20));

    process.off('unhandledRejection', onUnhandled);
    assert.equal(unhandled, false);
  });
});
