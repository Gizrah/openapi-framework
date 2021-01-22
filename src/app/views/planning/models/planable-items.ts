import { NumberFormatStyle } from '@angular/common'

interface IPlanableItem {
	id: NumberFormatStyle
	avatar?: string
	name: string
	toPlan: number
	overPlanned: number
}

export class PlanableItem {
	public id = 0
	public avatar? = ''
	public name = ''
	public toPlan = 0
	public overPlanned = 0

	constructor(attr?: IPlanableItem) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}

	public isPlanable(): boolean {
		return !Boolean(this.toPlan <= 0)
	}
}
