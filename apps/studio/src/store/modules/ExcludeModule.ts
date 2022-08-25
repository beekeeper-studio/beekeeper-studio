import { ExcludedEntity } from "../../common/appdb/models/ExcludedEntity";
import { useBaseEntityModule } from "./useBaseEntityModule";

export const ExcludeEntityModule = useBaseEntityModule<ExcludedEntity>(ExcludedEntity)