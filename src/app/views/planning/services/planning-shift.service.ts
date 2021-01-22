import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class PlanningShiftService {
	shiftGroups: ShiftGroup[] = [
		new ShiftGroup({
			name: 'Banket bakkers',
			group: 'banket',
			items: [
				new ShiftItem({
					name: 'Jaap',
					gender: Gender.male,
					id: 14,
				}),
				new ShiftItem({
					name: 'Pet',
					gender: Gender.male,
					id: 32,
				}),
				new ShiftItem({
					name: 'Lieke',
					gender: Gender.female,
					id: 33,
				}),
				new ShiftItem({
					name: 'Pim',
					gender: Gender.male,
					id: 27,
				}),
				new ShiftItem({
					name: 'Petra',
					gender: Gender.female,
					id: 19,
				}),
				new ShiftItem({
					name: 'Anouk',
					gender: Gender.female,
					id: 7,
				}),
			],
		}),
		new ShiftGroup({
			name: 'Brood bakkers',
			group: 'brood',
			items: [
				new ShiftItem({
					name: 'Jaap',
					gender: Gender.male,
					id: 40,
				}),
				new ShiftItem({
					name: 'Pet',
					gender: Gender.male,
					id: 25,
				}),
				new ShiftItem({
					name: 'Lieke',
					gender: Gender.female,
					id: 33,
				}),
				new ShiftItem({
					name: 'Pim',
					gender: Gender.male,
					id: 1,
				}),
				new ShiftItem({
					name: 'Petra',
					gender: Gender.female,
					id: 54,
				}),
				new ShiftItem({
					name: 'Anouk',
					gender: Gender.female,
					id: 7,
				}),
			],
		}),
		new ShiftGroup({
			name: 'Schoonmaak',
			group: 'schoonmaak',
			items: [
				new ShiftItem({
					name: 'Petra',
					gender: Gender.female,
					id: 12,
				}),
				new ShiftItem({
					name: 'Anouk',
					gender: Gender.female,
					id: 7,
				}),
			],
		}),
	]
}

export enum Gender {
	male = 'men',
	female = 'women',
}

export class ShiftItem {
	image?: string
	name: string
	id: number
	gender: Gender

	constructor(data) {
		this.name = data.name
		this.id = data.id
		this.gender = data.gender
	}
}

export class ShiftGroup {
	name: string
	group: string
	items: ShiftItem[]

	constructor(data) {
		this.name = data.name
		this.items = data.items
	}
}

export class ShiftTotal {
	groups: ShiftGroup[]

	constructor(data) {
		this.groups = data.groups
	}
}
