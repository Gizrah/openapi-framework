import { PlanningHelpers } from '../scripts/planning-helpers'
import { PlannedResource } from './planned-resource'

export class PlanningItem {
	public resources: PlannedResource[] = []
	public location = null

	public startDate: PlanningItemDate = null
	public endDate: PlanningItemDate = null

	public duration = ''

	public dependencies?: any[] = []

	public status = ''
	public id? = ''
	public color? = ''

	public leftPos? = ''
	public width? = ''

	constructor(attr) {
		this.resources = attr.resources
		this.location = attr.location

		this.startDate = attr.startDate
		this.endDate = attr.endDate
		this.duration = attr.duration
		this.dependencies = attr.dependencies
		this.status = attr.status
		this.id = attr.id
		this.color = attr.color

		this.leftPos = attr.leftPos
		this.width = attr.width
	}
}

export class PlanningItemDate {
	public day = 0
	public month = 0
	public year = 0
	public hour = 0
	public minute = 0
	public second = 0
	public unix = 0

	public dayName = ''
	public dayNameShort = ''
	public time = ''

	constructor(data: any) {
		const date = PlanningHelpers.dateModelToDateTime(data)

		this.day = date.day
		this.month = date.month
		this.year = date.year
		this.hour = date.hour
		this.minute = date.minute
		this.second = date.second
		this.unix = date.toMillis()
		this.dayName = date.weekdayLong
		this.dayNameShort = date.weekdayShort
		this.time = `${PlanningHelpers.addZeros(date.hour)}:${PlanningHelpers.addZeros(
			date.minute,
		)}`
	}
}

export class PlanningDay {
	date?: PlanningItemDate = null
	items?: PlanningItem[] = []
	itemsByDay?: PlanningItem[][]
	height? = ''
	minHeight? = ''

	constructor(data) {
		this.date = new PlanningItemDate(data.date)
		this.items = data.items ?? []
		this.itemsByDay = data.itemsByDay ?? []
		this.height = data.height
		this.minHeight = data.minHeight
	}
}
