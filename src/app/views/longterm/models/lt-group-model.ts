import { DateTime } from 'luxon'
import { PlanningHelpers } from '../../planning/scripts/planning-helpers'

export class LtBaseClasse {
	constructor(attr?: any) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}

export interface iLtLocations {
	name: string
	locations: LtLocationItem[]
	id: number
}

export class LtLocations {
	name: string = ''
	locations: LtLocationItem[] = []
	id: number = 0

	constructor(attr?: iLtLocations) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}

export interface iLtLocationItem {
	name: string
	groups: LtLocationGroup[]
	id: number
}

export class LtLocationItem {
	name: string = ''
	groups: LtLocationGroup[] = []
	id: number = 0

	constructor(attr?: iLtLocationItem) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}
export interface iLtLocationGroup {
	name: string
	availability: LocationGroupAvailibility
	id: number
	selected?: boolean
	startDate?: DateTime | string
	endDate?: DateTime | string
	cat?: string
}

export class LtLocationGroup {
	name: string = ''
	availability: LocationGroupAvailibility = LocationGroupAvailibility.AVAILABLE
	id: number = 0
	selected?: boolean = false
	startDate? = PlanningHelpers.dateTime().toISODate()
	endDate? = PlanningHelpers.dateTime().plus({ months: 5 }).toISODate()
	cat? = null

	constructor(attr?: iLtLocationGroup) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}

export enum LocationGroupAvailibility {
	AVAILABLE,
	MAYBE,
	UNAVAILABLE,
}
