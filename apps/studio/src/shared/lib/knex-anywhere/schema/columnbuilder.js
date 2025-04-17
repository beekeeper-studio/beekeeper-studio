import ColumnBuilder from 'knex/lib/schema/columnbuilder';
import _ from 'lodash';

class ColumnBuilder_Sqlanywhere extends ColumnBuilder {
    // checkIn added to the builder to allow the column compiler to change the
    // order via the modifiers ("check" must be after "default")
    checkIn() {
        this._modifiers.checkIn = _.toArray(arguments);
        return this;
    }
}

export default ColumnBuilder_Sqlanywhere
