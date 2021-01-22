import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { FormlyFormOptions } from '@ngx-formly/core'
import { NgqFieldConfig } from '@quebble/formly'
import { TransnamicService } from '@quebble/services'
import { PlanningHelpers } from 'app/views/planning/scripts/planning-helpers'
import { DateTime } from 'luxon'

import { LtDay } from '../ngq-lt-days/ngq-lt-days.component'

export class LtContractCard {
	fullName = ''
	dateOfBirth: string
	location = ''
	days: LtDay[] = []
	products: any[] = []
	startDate: DateTime
	status = ''
	proposals: LtContractProposal[] = []

	constructor(data: any) {
		this.fullName = data.fullName ?? ''
		this.dateOfBirth = data.dateOfBirth
		this.location = data.location ?? ''
		this.days = data.days ?? []
		this.products = data.products ?? []
		this.startDate = data.startDate ?? PlanningHelpers.dateTime()
		this.status = data.status ?? ''
		this.proposals = data.proposals ?? []
	}
}

/**
 * This component is used to show information about the user who is on the waitinglist.
 * It has also a placement proposal.
 *
 * TODO: Move models to their own location
 *
 */

@Component({
	selector: 'ngq-lt-contract-card',
	templateUrl: './ngq-lt-contract-card.component.html',
	styleUrls: ['./ngq-lt-contract-card.component.scss'],
	providers: [TransnamicService],
})
export class NgqLtContractCardComponent implements OnInit, OnChanges {
	@Input() person: any = {}
	@Input() location: any = {}
	@Input() set locations(items: any[]) {
		this._locations = items
		if (!!items?.length) {
			this.locationsList = this.getLocations()
		}
	}
	get locations() {
		return this._locations
	}
	private _locations: any[] = []

	public locationsList: any[] = []

	public _hasProducts: boolean = false

	public form = new FormGroup({})
	public formFields: NgqFieldConfig[] = []
	public options: FormlyFormOptions = {}
	public object = {
		days: {
			monday: false,
			tuesday: false,
			wednesday: false,
			thursday: false,
			friday: false,
			saterday: false,
			sunday: false,
		},
	}

	public displayedColumns: string[] = ['groupType', 'locationName', 'groupName', 'startDate']
	public contract = null
	constructor(private transnamic: TransnamicService) {}

	ngOnInit(): void {
		this.contract = this.generateContract()

		console.log('locationsList: ', this.locationsList)

		/**
		 * In the design I made it a form, and I started with that, but I think it's better to have a different place to edit and update a contract proposal.
		 * Otherwise you are have so much places to do this. This has also a big impact when you do changes in the code.
		 */
		this.formFields = [
			{
				key: 'location',
				type: 'select',
				wrappers: ['row-label-input', 'form-field'],
				templateOptions: {
					label: 'Locatie',
					options: this.locationsList,
					readonly: true,
				},
				hideExpression: () => !this.locationsList?.length,
			},
			{
				key: 'days',
				wrappers: ['row-label-input'],
				templateOptions: {
					label: 'Dagen',
				},
				fieldGroup: [
					{
						key: 'monday',
						type: 'checkbox',
						templateOptions: {
							label: 'Maandag',
							required: true,
							readonly: true,
						},
					},
					{
						key: 'tuesday',
						type: 'checkbox',
						templateOptions: {
							label: 'Dinsdag',
							readonly: true,
						},
					},
					{
						key: 'wednesday',
						type: 'checkbox',
						templateOptions: {
							label: 'Woensdag',
							readonly: true,
							required: true,
						},
					},
					{
						key: 'thursday',
						type: 'checkbox',
						templateOptions: {
							label: 'Donderdag',
							readonly: true,
							required: true,
						},
					},
					{
						key: 'friday',
						type: 'checkbox',
						templateOptions: {
							label: 'Vrijdag',
							readonly: true,
							required: true,
						},
					},
					{
						key: 'saterday',
						type: 'checkbox',
						templateOptions: {
							label: 'Zaterdag',
							readonly: true,
							required: true,
						},
					},
					{
						key: 'sunday',
						type: 'checkbox',
						templateOptions: {
							label: 'Zondag',
							readonly: true,
							required: true,
						},
					},
				],
			},
			{
				key: 'products',
				type: 'select',
				wrappers: ['row-label-input', 'form-field'],
				templateOptions: {
					label: 'Producten',
					options: [
						{ value: 'single', label: 'Single product' },
						{ value: 'bulk', label: 'Bulk product' },
					],
					readonly: true,
				},
			},
		]
	}

	ngOnChanges(changes: SimpleChanges): void {
		console.log('changes: ', changes)
		if (changes.person || changes.Location) {
			this.contract = this.generateContract()
		}
	}

	/**
	 * Generate random contract data
	 */
	private generateContract(): LtContractCard {
		this._hasProducts = this.person?.products?.length !== 0

		return new LtContractCard({
			fullName: this.person?.name,
			dateOfBirth: this.person?.dateOfBirthTimeAgo,
			days: this.person?.days,
			location: this.location?.name,
			startDate: PlanningHelpers.dateTimeFormat(
				PlanningHelpers.dateTime().plus({ days: 10 }).toJSDate(),
			),
			endDate: this.person?.endDate,
			status: 'concept',
			proposals: this.generateProposalPlacement(this.person?.dateOfBirth),
			products: this.person?.products ?? [],
		})
	}

	private getLocations(): any[] {
		const loc = this.locations.map((loc) => {
			return { value: loc.id, label: loc.name }
		})
		console.log('loc: ', loc)
		return loc
	}

	/**
	 * Generate random placement proposal data to show in the view
	 */
	private generateProposalPlacement(age) {
		const today = PlanningHelpers.dateTime()
		const startDate = PlanningHelpers.dateTime()

		let currentGroup = null
		const diff = startDate.diff(age, ['years', 'months', 'days']).toObject()
		console.log('diff', diff)

		if (diff.years === 0) {
			currentGroup = 'baby'
		} else if (diff.years >= 1 && diff.years < 4) {
			currentGroup = 'todler'
		} else if (diff.years >= 4 && diff.years < 7) {
			currentGroup = 'kid'
		} else if (diff.years >= 7) {
			currentGroup = 'teen'
		}
		console.log('currentGroup', currentGroup)

		const babyProp = new LtContractProposal({
			groupType: 'Baby',
			locationName: 'Locatie A',
			groupName: 'Groep A',
			startDate,
			endDate: startDate.plus({ year: 1 }),
		})

		const todlerProp = new LtContractProposal({
			groupType: 'Peuter',
			locationName: 'Locatie A',
			groupName: 'Groep A',
			startDate: startDate.plus({ year: 1, days: 1 }),
			endDate: startDate.plus({ year: 3 }),
		})

		const kidProp = new LtContractProposal({
			groupType: 'Kleuter',
			locationName: 'Locatie A',
			groupName: 'Groep A',
			startDate: startDate.plus({ year: 3, days: 1 }),
			endDate: startDate.plus({ year: 6 }),
		})

		const teenProp = new LtContractProposal({
			groupType: 'Tiener',
			locationName: 'Locatie A',
			groupName: 'Groep A',
			startDate: startDate.plus({ year: 3, days: 1 }),
			endDate: startDate.plus({ year: 6 }),
		})

		let proposal = null

		switch (currentGroup) {
			case 'baby':
				proposal = [babyProp, todlerProp, kidProp, teenProp]
				break

			case 'todler':
				proposal = [todlerProp, kidProp, teenProp]
				break

			case 'kid':
				proposal = [kidProp, teenProp]
				break

			case 'teen':
				proposal = [teenProp]
				break

			default:
				proposal = []
				break
		}

		console.log('proposal', proposal)
		return proposal
	}
}

export class LtContractProposal {
	groupType: string = ''
	locationName: string = ''
	groupName: string = ''
	startDate: DateTime = null
	startDateFormatted: string = null
	endDate: DateTime = null
	endDateFormatted: string = null

	constructor(data: any) {
		this.groupType = data.groupType
		this.locationName = data.locationName
		this.groupName = data.groupName
		this.startDate = data.startDate

		this.startDateFormatted = PlanningHelpers.dateTimeFormat(this.startDate.toJSDate(), {
			dateStyle: 'short',
		})
		this.endDate = data.endDate
		this.endDateFormatted = PlanningHelpers.dateTimeFormat(this.endDate.toJSDate(), {
			dateStyle: 'short',
		})
	}
}
