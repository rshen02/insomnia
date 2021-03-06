// @flow
import * as db from '../common/database';
import type { BaseModel } from './index';
import * as MIPluginHelper from '../plugins/mi-helper';

export const name = 'Folder';
export const type = 'RequestGroup';
export const prefix = 'fld';
export const canDuplicate = true;
export const canSync = true;

type BaseRequestGroup = {
  name: string,
  description: string,
  environment: Object,
  environmentPropertyOrder: Object | null,
  metaSortKey: number,
};

export type RequestGroup = BaseModel & BaseRequestGroup;

export function init(): BaseRequestGroup {
  return {
    name: 'New Folder',
    description: '',
    environment: {},
    environmentPropertyOrder: null,
    metaSortKey: -1 * Date.now(),
  };
}

export function migrate(doc: RequestGroup) {
  return doc;
}

export function create(patch: $Shape<RequestGroup> = {}): Promise<RequestGroup> {
  if (!patch.parentId) {
    throw new Error('New RequestGroup missing `parentId`: ' + JSON.stringify(patch));
  }

  return db.docCreate(type, patch).then(res => MIPluginHelper.create(res));
}

export function update(
  requestGroup: RequestGroup,
  patch: $Shape<RequestGroup> = {},
): Promise<RequestGroup> {
  return db.docUpdate(requestGroup, patch).then(res => MIPluginHelper.update(res));
}

export function getById(id: string): Promise<RequestGroup | null> {
  return db.get(type, id);
}

export function findByParentId(parentId: string): Promise<Array<RequestGroup>> {
  return db.find(type, { parentId });
}

export function remove(requestGroup: RequestGroup): Promise<void> {
  return db.remove(requestGroup).then(() => MIPluginHelper.remove(requestGroup));
}

export function all(): Promise<Array<RequestGroup>> {
  return db.all(type);
}

export async function duplicate(
  requestGroup: RequestGroup,
  patch: $Shape<RequestGroup> = {},
): Promise<RequestGroup> {
  if (!patch.name) {
    patch.name = `${requestGroup.name} (Copy)`;
  }

  // Get sort key of next request
  const q = { metaSortKey: { $gt: requestGroup.metaSortKey } };
  const [nextRequestGroup] = await db.find(type, q, { metaSortKey: 1 });
  const nextSortKey = nextRequestGroup
    ? nextRequestGroup.metaSortKey
    : requestGroup.metaSortKey + 100;

  // Calculate new sort key
  const sortKeyIncrement = (nextSortKey - requestGroup.metaSortKey) / 2;
  const metaSortKey = requestGroup.metaSortKey + sortKeyIncrement;

  return db
    .duplicate(requestGroup, { metaSortKey, ...patch })
    .then(res => MIPluginHelper.duplicate(res));
}
