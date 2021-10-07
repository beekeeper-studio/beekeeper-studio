import { ICloudSavedConnection } from "@/common/interfaces/IConnection";
import { GenericController } from "@/lib/cloud/controllers/GenericController";

export class ConnectionsController extends GenericController<ICloudSavedConnection> {
  name = 'connection'
  plural = 'connections'
  path = '/connections'
}