#!/usr/bin/env node
/**
 * push-to-mongo.mjs
 *
 * Reads map/graph.json and upserts nodes / edges / rooms into MongoDB.
 * `mongodb` is imported lazily so this file is safe to keep in the repo
 * before the database branch is pulled.
 *
 * Usage:
 *   MONGODB_URI="mongodb://localhost:27017" node scripts/push-to-mongo.mjs
 *   node scripts/push-to-mongo.mjs --uri mongodb://... --db momo
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAP_DIR = resolve(__dirname, '..', 'map');

function parseArgs(argv) {
  const args = {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    db: process.env.MONGODB_DB || 'momo',
    graph: resolve(MAP_DIR, 'graph.json'),
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--uri') args.uri = argv[++i];
    else if (a === '--db') args.db = argv[++i];
    else if (a === '--graph') args.graph = resolve(process.cwd(), argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const graph = JSON.parse(readFileSync(args.graph, 'utf8'));

  let MongoClient;
  try {
    ({ MongoClient } = await import('mongodb'));
  } catch {
    console.error('The "mongodb" package is not installed. Pull the database branch first.');
    process.exit(1);
  }

  const client = new MongoClient(args.uri);
  await client.connect();
  const db = client.db(args.db);

  const upsertAll = async (coll, docs) => {
    if (!docs.length) return;
    const ops = docs.map((d) => ({
      updateOne: { filter: { _id: d._id }, update: { $set: d }, upsert: true },
    }));
    const res = await db.collection(coll).bulkWrite(ops);
    console.log(`${coll}: ${res.upsertedCount} inserted, ${res.modifiedCount} updated`);
  };

  await upsertAll('nodes', graph.nodes);
  await upsertAll('edges', graph.edges);
  await upsertAll('rooms', graph.rooms);

  await client.close();
  console.log(`done → ${args.uri}/${args.db}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
