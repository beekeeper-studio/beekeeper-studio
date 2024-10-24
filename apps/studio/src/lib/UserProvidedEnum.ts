import _ from "lodash";

export class UserProvidedEnum {
	name: string;
	variants: { id: string, value: string }[];
	constructor(json: any) {
		if (json.name == undefined || json.variants == undefined || 
			!_.isString(json.name) || !_.isArray(json.variants)) {
			throw new Error('Invalid JSON');
		}

		this.name = json.name;
		this.variants = [];

		for (let i = 0; i < json.variants.length; i++) {
			const variant = json.variants[i];

			if (variant.id != undefined && variant.value != undefined) 
				this.variants.push({ id: variant.id, value: variant.value });
		}

		if (this.variants.length == 0) throw new Error(`Enum ${this.name} does not have any variants`);
	}

	// TODO (day): should probably clean this up for other types
	findMatch(id: string): string {
		const variant = this.variants.find((val) => val.id == id);
		return variant ? variant.value : null;
	}
}
