// @flow
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import type { ApiSpec, BaseModel } from './types';
import { AutoComplete } from 'enquirer';

export type Database = {|
  ApiSpec: Map<string, ApiSpec>, // Convert to arrays instead of Map
  Environment: Map<string, BaseModel>,
  Request: Map<string, BaseModel>,
  RequestGroup: Map<string, BaseModel>,
  Workspace: Map<string, BaseModel>,
|};

export const emptyDb = (): Database => ({
  ApiSpec: new Map(),
  Environment: new Map(),
  Request: new Map(),
  RequestGroup: new Map(),
  Workspace: new Map(),
});

type Options = {
  dir: string,
  filterTypes?: Array<$Keys<Database>>,
};

export const gitDataDirDb = async ({ dir, filterTypes }: Options): Promise<Database> => {
  const db = emptyDb();
  const insomniaDir = path.join(dir, '.insomnia');

  if (!fs.existsSync(insomniaDir)) {
    // TODO: control logging with verbose flag
    // console.log(`Directory not found: ${insomniaDir}`);
    return db;
  }

  const readAndInsertDoc = async (type: $Keys<Database>, fileName: string): Promise<void> => {
    // Get contents of each file in type dir and insert into data
    const contents = await fs.promises.readFile(fileName);
    const obj = YAML.parse(contents.toString());

    db[type].set(obj._id, obj);
  };

  const types = filterTypes?.length ? filterTypes : Object.keys(db);

  await Promise.all(
    types.map(async type => {
      // Get all files in type dir
      const typeDir = path.join(insomniaDir, type);
      if (!fs.existsSync(typeDir)) {
        return;
      }

      const files = await fs.promises.readdir(typeDir);
      return Promise.all(
        // Insert each file from each type
        files.map(file => readAndInsertDoc(type, path.join(insomniaDir, type, file))),
      );
    }),
  );

  return db;
};

export async function getApiSpecFromIdentifier(
  db: Database,
  identifier?: string,
): Promise<?ApiSpec> {
  const allSpecs = Array.from(db.ApiSpec.values());

  if (identifier) {
    const result = allSpecs.find(s => s.fileName === identifier || s._id.startsWith(identifier));
    return result;
  }

  const prompt = new AutoComplete({
    name: 'apiSpec',
    message: 'Select an API Specification',
    choices: ['Dummy spec - spc_123456', 'I exist (not) - spc_789123'].concat(
      allSpecs.map(s => `${s.fileName} - ${s._id.substr(0, 10)}`),
    ),
  });

  const [, idIsh] = (await prompt.run()).split(' - ');
  return allSpecs.find(s => s._id.startsWith(idIsh));
}