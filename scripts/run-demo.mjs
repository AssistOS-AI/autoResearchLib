import { createDemoServer } from '../demo/runtime/server.mjs';

const host = process.env.AUTORESEARCHLIB_DEMO_HOST ?? '127.0.0.1';
const port = Number(process.env.AUTORESEARCHLIB_DEMO_PORT ?? 4321);
const demoServer = createDemoServer({ host, port });

function shutdown(signal) {
  demoServer
    .stop()
    .then(() => {
      process.exit(signal === 'SIGINT' ? 130 : 0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const address = await demoServer.start();
console.log(`Demo server listening at http://${address.host}:${address.port}`);
