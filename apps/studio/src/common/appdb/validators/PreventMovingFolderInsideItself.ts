import { registerDecorator, ValidationArguments } from "class-validator";
import { BaseEntity } from "typeorm";

/**
 * Rejects a parentId that would make a folder its own descendant.
 *
 * Applied to the parentId column of a self-referencing entity. The table is read
 * from the entity's own metadata, so this works for any folder type.
 */
export function PreventMovingFolderInsideItself(object: Object, propertyName: string) {
  registerDecorator({
    name: 'preventMovingFolderInsideItself',
    async: true,
    target: object.constructor,
    propertyName: propertyName,
    validator: {
      async validate(parentId: unknown, args: ValidationArguments) {
        const entity = args.object as BaseEntity & { id?: number | null }

        // A row with no id yet can't be anyone's ancestor, and a root has
        // nothing above it to collide with.
        if (!entity.id || parentId == null) {
          return true;
        }

        const repository = (entity.constructor as typeof BaseEntity).getRepository();
        // From TypeORM metadata, not user input — safe to interpolate.
        const table = repository.metadata.tableName;

        // Walk up from the *pending* parent, not the stored one: validation runs
        // before the write, so the row still points at the old parent.
        //
        // UNION, not UNION ALL: nothing enforced acyclicity before this check
        // existed, so an old app.db can still hold a cycle. UNION ALL would
        // recurse forever on one and hang the utility process; deduping on id
        // terminates instead.
        const ancestors = await repository.query(
          `WITH RECURSIVE ancestors(id, parentId) AS (
             SELECT id, parentId FROM ${table} WHERE id = ?
             UNION
             SELECT f.id, f.parentId FROM ${table} f
               JOIN ancestors ON f.id = ancestors.parentId
           )
           SELECT id FROM ancestors`,
          [parentId]
        );

        return !ancestors.some((a: { id: number }) => a.id === entity.id);
      },
      defaultMessage(args: ValidationArguments) {
        const { name } = args.object as { name?: string };
        return `Cannot move folder "${name}" inside itself.`;
      }
    }
  })
}
