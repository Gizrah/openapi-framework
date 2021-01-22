import { PlannedCondition } from './planned-condition'

interface IPlannedResource {
	id: string
	type: string
	resourceId: string
	conditions: PlannedCondition[]
}

export class PlannedResource {
	public id = ''
	public type = ''
	public resourceId = ''
	public conditions = null

	constructor(attr?: IPlannedResource) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}
