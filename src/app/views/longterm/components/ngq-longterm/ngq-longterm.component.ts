import { rndNum } from '@quebble/scripts'

import { Component, OnInit } from '@angular/core'
import { PlanningHelpers } from 'app/views/planning/scripts/planning-helpers'
import { DateTime, Info } from 'luxon'

import {
	LocationGroupAvailibility,
	LtLocationGroup,
	LtLocationItem,
	LtLocations,
} from '../../models/lt-group-model'
import { LtDay } from '../ngq-lt-days/ngq-lt-days.component'

/**
 * Overal component for showing the columns of the longterm view.
 * Here we generate the data for kids, locations and personLocations.
 * This is so only this component has the data and the rest will only recieve it thanks to inputs of child components
 *
 * @TODO: Data needs to be fetched from external API
 * @TODO: Make working flow for the user
 * @TODO: Move models to their own location
 */
@Component({
	selector: 'ngq-ngq-longterm',
	templateUrl: './ngq-longterm.component.html',
	styleUrls: ['./ngq-longterm.component.scss'],
})
export class NgqLongtermComponent implements OnInit {
	public locations = []
	public kids = []
	public personLocations = []
	public selectedLocation = null
	public selectedKid = null

	constructor() {}

	ngOnInit(): void {
		this.locations = this.generateItems('Locatie')
		this.kids = this.generateItems('Kids')
		this.personLocations = this.generateGroups()
	}

	selectLocation(item: any) {
		this.selectedLocation = item
	}

	public selectKid(item: any): void {
		this.selectedKid = item
	}

	/**
	 * Generate data for the location and kids columns
	 *
	 */
	private generateItems(name: string): any[] {
		return Array.from(Array(40), (x, index) => {
			const id = index + 1

			let item = {
				id,
				name: `${name} ${id}`,
			}

			if (name === 'Kids') {
				const days = this.generateDays()
				const dateOfBirth = PlanningHelpers.dateTime().minus({
					year: rndNum(0, 14),
					month: rndNum(0, 11),
				})

				const person = {
					days,
					dateOfBirth,
					dateOfBirthTimeAgo: this.timeAgo(dateOfBirth),
					products: this.generateProductsList(),
				}
				item = { ...person, ...item }
			}

			return item
		})
	}

	private generateDays() {
		const weekdays = Info.weekdays('short', { locale: PlanningHelpers.LOCALE })
		const randomNumber = rndNum(1, 7)
		return Array.from(Array(randomNumber), (x, index) => {
			return new LtDay({ name: weekdays[index], key: index })
		})
	}

	/**
	 * Generate random list of products to show in the view
	 */
	private generateProductsList(): string[] {
		const products = ['KDV', 'BSO', 'TSO', 'Zwemles', 'Ontbijtservice', 'Lunchservice']
		const randomArrayLength = rndNum(0, products.length - 1)

		return Array.from(Array(randomArrayLength), () => rndNum(0, products.length - 1)).map(
			(product, _, arr) => {
				const prodFromList = arr.indexOf(product) ? rndNum(0, products.length - 1) : product
				return products[prodFromList]
			},
		)
	}

	/**
	 * Create human readable date
	 */
	private timeAgo(past): string {
		const now = DateTime.local()
		const diff = now.diff(past, ['years', 'months'])
		const years = Math.floor(diff.years)
		const yearsStr = `${years} jaar`
		const months = Math.floor(diff.months)
		const monthsStr = months !== 0 ? `, ${months} maanden` : ''
		return `${yearsStr}${monthsStr}`
	}

	/**
	 * Hardcoded data for the group view where we show tha occupation per group and location.
	 * The goals is to show the user where there is a spot for a kid and where not.
	 */
	private generateGroups(): LtLocations[] {
		return [
			new LtLocations({
				id: 0,
				name: 'Locatie A',
				locations: [
					new LtLocationItem({
						id: 1,
						name: 'Baby',
						groups: [
							new LtLocationGroup({
								id: 0,
								name: 'Abab',
								availability: LocationGroupAvailibility.AVAILABLE,
								cat: 'Baby',
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 1,
								name: 'Banaaaasdasdasdaaan',
								availability: LocationGroupAvailibility.UNAVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 2,
								name: 'C',
								availability: LocationGroupAvailibility.MAYBE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 3,
								name: 'D',
								availability: LocationGroupAvailibility.MAYBE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 4,
								name: 'E',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
						],
					}),
					new LtLocationItem({
						id: 2,
						name: 'Peuter',
						groups: [
							new LtLocationGroup({
								cat: 'Peuter',
								id: 5,
								name: 'P',
								availability: LocationGroupAvailibility.UNAVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Peuter',
								id: 6,
								name: 'Q',
								availability: LocationGroupAvailibility.MAYBE,
							}),
							new LtLocationGroup({
								cat: 'Peuter',
								id: 7,
								name: 'R',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Peuter',
								id: 8,
								name: 'S',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
						],
					}),
					new LtLocationItem({
						id: 3,
						name: 'Kleuter',
						groups: [
							new LtLocationGroup({
								cat: 'Kleuter',
								id: 9,
								name: 'U',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Kleuter',
								id: 10,
								name: 'V',
								availability: LocationGroupAvailibility.UNAVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Kleuter',
								id: 11,
								name: 'W',
								availability: LocationGroupAvailibility.MAYBE,
							}),
						],
					}),
				],
			}),
			new LtLocations({
				id: 2,
				name: 'Locatie B',
				locations: [
					new LtLocationItem({
						id: 4,
						name: 'Baby',
						groups: [
							new LtLocationGroup({
								cat: 'Baby',
								id: 12,
								name: 'Abab',
								availability: LocationGroupAvailibility.UNAVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 13,
								name: 'Banaaaaaan',
								availability: LocationGroupAvailibility.MAYBE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 14,
								name: 'C',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 15,
								name: 'D',
								availability: LocationGroupAvailibility.UNAVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 16,
								name: 'E',
								availability: LocationGroupAvailibility.MAYBE,
							}),
						],
					}),
					new LtLocationItem({
						id: 5,
						name: 'Peuter',
						groups: [
							new LtLocationGroup({
								cat: 'Peuter',
								id: 17,
								name: 'P',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Peuter',
								id: 18,
								name: 'Q',
								availability: LocationGroupAvailibility.UNAVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Peuter',
								id: 19,
								name: 'R',
								availability: LocationGroupAvailibility.MAYBE,
							}),
							new LtLocationGroup({
								cat: 'Peuter',
								id: 20,
								name: 'S',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
						],
					}),
					new LtLocationItem({
						id: 6,
						name: 'Kleuter',
						groups: [
							new LtLocationGroup({
								cat: 'Kleuter',
								id: 21,
								name: 'U',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Kleuter',
								id: 22,
								name: 'V',
								availability: LocationGroupAvailibility.UNAVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Kleuter',
								id: 23,
								name: 'W',
								availability: LocationGroupAvailibility.MAYBE,
							}),
						],
					}),
				],
			}),
			new LtLocations({
				id: 13,
				name: 'Locatie C',
				locations: [
					new LtLocationItem({
						id: 7,
						name: 'Baby',
						groups: [
							new LtLocationGroup({
								cat: 'Baby',
								id: 24,
								name: 'Abab',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 25,
								name: 'Banaaaaaan',
								availability: LocationGroupAvailibility.UNAVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 26,
								name: 'C',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 27,
								name: 'D',
								availability: LocationGroupAvailibility.MAYBE,
							}),
							new LtLocationGroup({
								cat: 'Baby',
								id: 28,
								name: 'E',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
						],
					}),
					new LtLocationItem({
						id: 8,
						name: 'Peuter',
						groups: [
							new LtLocationGroup({
								cat: 'Peuter',
								id: 29,
								name: 'P',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Peuter',
								id: 30,
								name: 'Q',
								availability: LocationGroupAvailibility.UNAVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Peuter',
								id: 31,
								name: 'R',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Peuter',
								id: 32,
								name: 'S',
								availability: LocationGroupAvailibility.MAYBE,
							}),
						],
					}),
					new LtLocationItem({
						id: 9,
						name: 'Kleuter',
						groups: [
							new LtLocationGroup({
								cat: 'Kleuter',
								id: 33,
								name: 'U',
								availability: LocationGroupAvailibility.UNAVAILABLE,
							}),
							new LtLocationGroup({
								cat: 'Kleuter',
								id: 34,
								name: 'V',
								availability: LocationGroupAvailibility.MAYBE,
							}),
							new LtLocationGroup({
								cat: 'Kleuter',
								id: 35,
								name: 'W',
								availability: LocationGroupAvailibility.AVAILABLE,
							}),
						],
					}),
				],
			}),
		]
	}
}
