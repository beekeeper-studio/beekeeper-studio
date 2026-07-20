import { IMembership } from "@/common/interfaces/IMembership";
import { GenericController } from "@/lib/cloud/controllers/GenericController";

export class MembershipsController extends GenericController<IMembership> {
  name = "membership"
  plural = "memberships"
  path = '/memberships'
}
