import { rndNum } from '@quebble/scripts'

import { Component, Input, OnInit } from '@angular/core'

import { LtLocationGroup, LtLocationItem, LtLocations } from '../../models/lt-group-model'

/**
 * This component is for showing the occupation of multiple locations and groups.
 *
 * @TODO: Get data from API
 */
@Component({
	selector: 'ngq-lt-group-availability-overview',
	templateUrl: './ngq-lt-group-availability-overview.component.html',
	styleUrls: ['./ngq-lt-group-availability-overview.component.scss'],
})
export class NgqLtGroupAvailabilityOverviewComponent implements OnInit {
	@Input() locations: LtLocations[] = []
	public selected: LtLocationGroup[] = []
	public occupationDetails: any[] = []
	public selectedGroupDetails: any = null

	constructor() {}

	ngOnInit(): void {
		this.prefillSelectedGroups()
		console.log('locations: ', this.locations)
	}

	private prefillSelectedGroups(): void {
		const randomNumber = rndNum(1, 7)
		const randomGroups = Array.from(Array(randomNumber), (x, index) => {
			const randomGroupSelection = this.getRandomLocationGroup()
			return this.selected.indexOf(randomGroupSelection) > -1
				? this.getRandomLocationGroup()
				: randomGroupSelection
		})
		this.selected = randomGroups
	}

	private getRandomLocationGroup(): LtLocationGroup {
		let randomLocation = null
		const locations = this.locations[rndNum(1, this.locations.length - 1)]
		const locationA = locations.locations[rndNum(0, 2)].groups[rndNum(0, 4)]
		console.log('locationA', locationA)
		const locationB = locations.locations[rndNum(0, 2)].groups[rndNum(0, 4)]
		console.log('locationB', locationB)

		randomLocation = locationA ?? locationB

		if (randomLocation) {
			randomLocation.selected = true
		}

		return randomLocation || null
	}

	public select(group: LtLocationGroup): void {
		const index = this.selected.indexOf(group)
		if (index > -1) {
			this.selected.splice(index, 1)
			this.toggleSelectedGroup(group, false)
		} else {
			this.selected.push(group)
			this.toggleSelectedGroup(group, true)
		}
	}

	public selectGroupDetails(location: LtLocationItem, group: LtLocationGroup): void {
		this.selectedGroupDetails = this.selectedGroupDetails !== null ? null : { location, group }

		this.occupationDetails = this.generateOccupationDetails()
	}

	private toggleSelectedGroup(group: LtLocationGroup, select: boolean): void {
		group.selected = select
	}

	private generateOccupationDetails(): any[] {
		const days = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
		return Array.from(Array(52), (x, index) => {
			return {
				weekNr: index + 1,
				days: Array.from(Array(7), (x, ix) => {
					return {
						day: days[ix],
						value: {
							professional: rndNum(1, 7),
							kids: rndNum(1, 25),
						},
						bkr: rndNum(1, 3),
					}
				}),
			}
		})
	}
}
