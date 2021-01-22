import {
	AfterViewInit,
	Component,
	ElementRef,
	Input,
	OnInit,
	Renderer2,
	ViewChild,
} from '@angular/core'
import { Methods } from '@quebble/scripts'
import { DateTime } from 'luxon'
import { BehaviorSubject, combineLatest, Subject } from 'rxjs'
import { filter, takeUntil } from 'rxjs/operators'

import { GlobalPlanningDate } from '../../models/planning-date'
import { PlanningDay, PlanningItem } from '../../models/planning-item'
import { PlanningShift } from '../../models/planning-shift'
import { TimelineElements } from '../../models/planning-timeline-elements'
import { PlanningHelpers } from '../../scripts/planning-helpers'
import { PlanningTimelineService } from '../../services/planning-timeline.service'

@Component({
	selector: 'ngq-planning-grid',
	templateUrl: './ngq-planning-grid.component.html',
	styleUrls: ['./ngq-planning-grid.component.scss'],
})
export class NgqPlanningGridComponent implements OnInit, AfterViewInit {
	private date$ = new BehaviorSubject<Date>(null)
	private _date: Date

	private shifts$ = new BehaviorSubject<PlanningShift[]>(null)
	private _shifts: PlanningShift[]

	private items$ = new BehaviorSubject<PlanningItem[]>(null)
	private _items: PlanningItem[]

	private minimal$ = new BehaviorSubject<boolean>(null)
	private _minimal: boolean

	public showGrid = false
	public elements: any = null
	public computedStyle = null
	private destroy$: Subject<void> = new Subject()
	private pixelsPerMinute = 0
	private _timeSlotHeight: string = null
	private rootFontSize = Methods.FontSize()

	public gridElements = new TimelineElements()

	@Input()
	set date(value) {
		this._date = value
		this.date$.next(value)
	}

	get date() {
		return this._date
	}

	@Input()
	set minimal(value) {
		this._minimal = value
		this.minimal$.next(value)
	}

	get minimal() {
		return this._minimal
	}

	@Input()
	set shifts(value) {
		this._shifts = value
		this.shifts$.next(value)
	}

	get shifts() {
		return this._shifts
	}

	@Input()
	set items(value) {
		this._items = value
		this.items$.next(value)
	}

	get items() {
		return this._items
	}

	public modifiedItems: PlanningDay[] = []
	public modifiedShifts: PlanningShift[] = []

	@ViewChild('gridWrapper', { static: false })
	set gridWrapper(element: ElementRef<HTMLElement>) {
		if (element?.nativeElement) {
			this.gridElements.gridWrapper.element = element.nativeElement
		}
	}

	@ViewChild('gridContainer', { static: false })
	set gridContainer(element: ElementRef<HTMLElement>) {
		if (element?.nativeElement) {
			this.gridElements.gridContainer.element = element.nativeElement
		}
	}

	@ViewChild('hoursList', { static: false })
	set hoursList(element: ElementRef<HTMLElement>) {
		if (element?.nativeElement) {
			this.gridElements.hours.element = element.nativeElement
		}
	}

	public dateObj: GlobalPlanningDate = new GlobalPlanningDate(new Date())
	private compEl: any = null
	private scrollContainerWidth: number = null

	constructor(
		private element: ElementRef,
		private render: Renderer2,
		private planning: PlanningTimelineService,
	) {}

	public ngOnInit(): void {
		this.showGrid = false
	}

	public ngAfterViewInit(): void {
		// this.buildTimeline(this.items, this.shifts)
		combineLatest(this.date$, this.shifts$, this.items$)
			.pipe(
				filter(([date, shifts, items]) => !!date && !!shifts && !!items),
				takeUntil(this.destroy$),
			)
			.subscribe(([date, shifts, items]) => {
				// setTimeout(() => {
				if (date !== this.date) {
					new GlobalPlanningDate(date).init().then((date) => {
						if (!date) return
						this.dateObj = date
					})
				}

				// if (items !== this.items || shifts !== this.shifts || date !== this.date) {
				this.buildTimeline(items, shifts)
				// }
			})
	}

	private buildTimeline(items: PlanningItem[], shifts: PlanningShift[]): void {
		this.compEl = this.element.nativeElement
		this.computedStyle = getComputedStyle(this.compEl)
		this._timeSlotHeight = this.computedStyle.getPropertyValue('--timeSlotHeight')

		this.modifiedItems = []
		this.modifiedShifts = []

		if (
			this.gridElements.hours.element ||
			this.gridElements.gridContainer.element ||
			this.gridElements.gridWrapper.element
		) {
			this.initCalculation().then((elements) => {
				setTimeout(async () => {
					this.elements = elements
					if (items.length > 0) {
						const planninItemsByDay = await this.planning.dividePlanningByDay(
							items,
							this._date,
							this.pixelsPerMinute,
							this.gridElements,
						)
						const modifiedItems = await this.setHeightDays(planninItemsByDay)
						const modifiedShifts = await this.setShiftPositions(shifts)

						this.modifiedItems = modifiedItems
						this.modifiedShifts = modifiedShifts

						this.scrollToTime()
					}
				})
			})
		}
	}

	private initCalculation(): Promise<any> {
		return new Promise((resolve, reject) => {
			try {
				const gridContainer = this.gridElements?.gridContainer?.element
				const gridWrapper = this.gridElements?.gridWrapper?.element
				const gridScroller = this.element.nativeElement
				const hours = this.gridElements?.hours?.element

				const timeSlots = this.gridElements.hours.element.children.length
				const timeSlotSize = this.computedStyle.getPropertyValue('--timeSlotSize')
				this.gridElements.timeSlotSize = timeSlotSize

				const timeSlotWidth = PlanningHelpers.replaceSizeUnit(timeSlotSize) * timeSlots
				const timeSlotNumber = PlanningHelpers.replaceSizeUnit(timeSlotSize)

				this.pixelsPerMinute = PlanningHelpers.replaceSizeUnit(timeSlotSize) / 60

				this.scrollContainerWidth = timeSlotWidth

				if (gridContainer) {
					this.render.setStyle(
						gridContainer,
						'width',
						this.scrollContainerWidth + timeSlotNumber + 'px',
					)
				}

				if (gridWrapper) {
					this.render.setStyle(
						gridWrapper,
						'width',
						this.scrollContainerWidth + timeSlotNumber + 'px',
					)
				}

				if (hours) {
					this.render.setStyle(
						hours,
						'width',
						this.scrollContainerWidth + timeSlotNumber + 'px',
					)
				}

				resolve({
					gridContainer,
					gridWrapper,
					gridScroller,
					timeSlotSize,
				})
			} catch (error) {
				reject(error)
			}
		})
	}

	/**
	 * Set's the left position and width of every PlanningShift
	 * This is to prevent some costly DOM manipulation outside the Angular renderer
	 * @param {PlanningShift[]} shifts - An Array of PlanningShift
	 * @return {PlanningShift[]} - An Array of PlanningShift with the size and position
	 */
	private setShiftPositions(shifts: PlanningShift[]): Promise<PlanningShift[]> {
		return new Promise((resolve, reject) => {
			try {
				const newShifts = shifts.map((shift) => {
					const newShift = new PlanningShift(shift)
					const { startEl } = this.planning.getTimeEl(
						shift.startTime.toString(),
						shift.endTime.toString(),
						this.gridElements.hours.element,
					)

					const startTime = DateTime.local().set({
						hour: shift.startTime,
						minute: 0,
					})
					const endTime = DateTime.local().set({
						hour: shift.endTime,
						minute: 0,
					})

					const duration = endTime.diff(startTime, 'minutes')
					const width = duration.minutes * this.pixelsPerMinute

					newShift.leftPos = startEl.offsetLeft + 'px'
					newShift.width = width + 'px'
					return newShift
				})

				resolve(newShifts)
			} catch (error) {
				reject('Something went wrong with setting shifts')
			}
		})
	}

	/**
	 * Calculate the height of every planning row to match the days in the layout,
	 * this is to prevent as much costly dom manipulation as possible
	 * @param {PlanningDay[]} items - An Array of PlanningDays
	 * @return {PlanningDay[]} An Array of PlanningDays with calculated height for each day
	 */
	private setHeightDays(items: PlanningDay[]): Promise<PlanningDay[]> {
		return new Promise((resolve, reject) => {
			try {
				const timeSlotHeight = this.styleCalcToNumber(this._timeSlotHeight)
				const newItems = items.map((item) => {
					const newItem = { ...item }

					// Amount of items per row * timeSlotHeight + timeSlotHeight (for the padding)
					const size = item.itemsByDay.length * timeSlotHeight + timeSlotHeight
					newItem.height = size + 17 + 'px'
					newItem.minHeight = size / 2 + 45 + 'px'

					return newItem
				})

				resolve(newItems)
			} catch (error) {
				reject('Something went wrong with setting days')
			}
		})
	}

	/**
	 * Calculate size in PX when a CSS variable includes calc(40px + 1rem)
	 * @param {string} calcStr - For example calc(40px + 1rem)
	 * @return {number} - Calculate the css calc function
	 */
	private styleCalcToNumber(calcStr: string): number {
		const calcPos = calcStr.indexOf('calc')
		const numbers = calcStr.substr(calcPos + 4)
		const calcSubstr = numbers.substring(1, numbers.length - 1).split(' ')
		// Create an array of the calculation to translate every number with em or rem unit to PX
		// to make that calculation in the end.
		const arr = calcSubstr.map((number) => PlanningHelpers.remToPx(number, this.rootFontSize))
		return PlanningHelpers.calculateString(arr.join(' '))
	}

	/**
	 * Scroll to the current time in the timeline
	 */
	public scrollToTime(): void {
		if (!this.elements) return

		const selector = `div[data-x-hour="${this.dateObj.hour}"]`

		const hour = this.gridElements.hours.element.querySelector(selector) as HTMLElement
		const timeSlotSize = this.computedStyle.getPropertyValue('--timeSlotSize')
		const scrollOffsetLeft =
			hour.offsetLeft - PlanningHelpers.replaceSizeUnit(timeSlotSize) + 1 ?? 0

		this.compEl.scrollTo({
			top: 0,
			left: scrollOffsetLeft,
			behavior: 'smooth',
		})
	}
}
