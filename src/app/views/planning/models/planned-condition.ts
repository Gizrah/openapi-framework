interface IPlannedCondition {
	id: string
	type: string
	value: Object
	conditionId: string
}

export class PlannedCondition {
	id = ''
	type = ''
	value = null
	conditionId = ''

	constructor(attr?: IPlannedCondition) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}
