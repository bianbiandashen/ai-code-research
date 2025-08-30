import { buildGraph } from './packages/graph-builder-agent/src/builder';
import { EnrichedEntity, FileEntity } from './packages/graph-builder-agent/src/types';
import { NebulaClient } from './packages/nebula-client/src/index';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import 'dotenv/config';

async function run() {
  console.log('Starting graph build process...');
  const nebulaClient = new NebulaClient({
    nebulaHost: process.env.NEBULA_HOST || '10.4.44.78',
  });
  await nebulaClient.connect();
  await nebulaClient.executeNgql(`USE code_graph`);

  const jsonPath = path.resolve(__dirname, 'apps/after-sale-demo/data/entities.enriched.json');
  console.log(`Reading data from: ${jsonPath}`);
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const entities: EnrichedEntity[] = JSON.parse(jsonData);

  console.log('Preparing file and entity data...');
  const fileMap = new Map<string, FileEntity>();
  for (const entity of entities) {
      if (!fileMap.has(entity.file)) {
          const filePath = entity.file;
          const fileId = crypto.createHash('md5').update(filePath).digest('hex');
          fileMap.set(filePath, {
              id: fileId,
              path: filePath,
              name: path.basename(filePath),
              extension: path.extname(filePath)
          });
          entity.file = fileId;
      } else {
          entity.file = fileMap.get(entity.file)!.id;
      }
  }
  const files: FileEntity[] = Array.from(fileMap.values());

  await buildGraph(files, entities, nebulaClient);
  console.log('Graph build process completed successfully!');
}

run().catch(error => {
    console.error("An error occurred during the build process:", error);
    process.exit(1);
}); 