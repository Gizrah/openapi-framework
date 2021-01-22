import { Component, ElementRef, OnInit, ViewChild } from '@angular/core'
import { MatDatepickerInputEvent } from '@angular/material/datepicker'
import { environment } from '@quebble/environment'
import { DateTime } from 'luxon'

import { PlanableItem } from '../../models/planable-items'
import { GlobalPlanningDate } from '../../models/planning-date'
import { PlanningItem } from '../../models/planning-item'
import { PlanningShift } from '../../models/planning-shift'
import { PlanningTimelineService } from '../../services/planning-timeline.service'

@Component({
	selector: 'ngq-planning',
	templateUrl: './ngq-planning.component.html',
	styleUrls: ['./ngq-planning.component.scss'],
})
export class NgqPlanningComponent implements OnInit {
	public planableItems: PlanableItem[] = []
	public dateObj = new Date()
	public currentDate: GlobalPlanningDate = null
	public shifts: PlanningShift[] = []
	public items: PlanningItem[][] = []
	public week: PlanningItem[][] = []
	public minimal = false
	public loader = true
	private apiCallFailed = false

	@ViewChild('planningGrid', { static: false })
	set planningGrid(element: ElementRef<HTMLElement>) {}

	constructor(private planning: PlanningTimelineService) {}

	public ngOnInit(): void {
		const generatedItems = Array.from(
			Array(40),
			(x, index) =>
				new PlanableItem({
					id: index + 1,
					name: `Item ${index + 1}`,
					toPlan: this.planning.randomNumber(),
					overPlanned: this.planning.randomNumber(),
				}),
		)
		this.planableItems = [...generatedItems]

		const now = DateTime.local().set({ hour: 0, minute: 0 })

		this.shifts = this.planning.generateShifts(now, 6)

		this.dateObj = new Date()
		this.setCurrentDate()
		this.generatePlanningWeek(this.dateObj)
	}

	public changeWeek(direction: string): void {
		const date = DateTime.fromJSDate(this.dateObj)
		const dir = direction === 'prev' ? date.minus({ week: 1 }) : date.plus({ week: 1 })
		this.changeDate(dir.toJSDate())
	}

	private async generatePlanningWeek(date: Date): Promise<any> {
		let items = []
		try {
			items =
				environment.dev && !this.apiCallFailed
					? await this.planning.getPlanningItems(date)
					: await this.planning.generatePlanningItemsWeek(date)
		} catch (error) {
			this.apiCallFailed = true
			items = await this.planning.generatePlanningItemsWeek(date)
		}

		this.items = items

		setTimeout(() => {
			this.loader = false
		}, 150)
	}

	private setCurrentDate(): void {
		this.currentDate = new GlobalPlanningDate(this.dateObj)
	}

	public onDateChanged(type: string, event: MatDatepickerInputEvent<any>): void {
		this.changeDate(event.value.toDate())
	}

	private changeDate(date: Date): void {
		this.loader = true
		const dateTime = DateTime.fromJSDate(date)
		this.dateObj = date
		this.setCurrentDate()
		this.shifts = this.planning.generateShifts(dateTime.set({ hour: 0, minute: 0 }), 6)
		this.generatePlanningWeek(this.dateObj)
	}

	public toggleMinimalMode() {
		this.minimal = !this.minimal
	}
}
