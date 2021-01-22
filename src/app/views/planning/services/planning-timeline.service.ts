import { rndNum } from '@quebble/scripts'

import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { DateTime } from 'luxon'

import { PlanningDay, PlanningItem, PlanningItemDate } from '../models/planning-item'
import { PlanningShift } from '../models/planning-shift'
import { PlanningTimeElement, TimeRange } from '../models/planning-time'
import { TimelineElements } from '../models/planning-timeline-elements'
import { PlanningHelpers } from '../scripts/planning-helpers'

@Injectable({ providedIn: 'root' })
export class PlanningTimelineService {
	constructor(private http: HttpClient) {}
	public getPlanningItems(date: Date): Promise<PlanningItem[][]> {
		return this.http
			.post<PlanningItem[][]>('/api/timeline', { date })
			.toPromise()
	}

	/**
	 * Group Planning items by Day
	 * @param items Array of PlanningItem
	 */
	public dividePlanningByDay(
		items: PlanningItem[],
		date: Date,
		pixelsPerMinute: number,
		timelineElments: TimelineElements,
	): Promise<PlanningDay[]> {
		return new Promise((resolve, reject) => {
			const days: PlanningDay[] = []
			const dateTime = DateTime.fromJSDate(date).startOf('week')

			items
				.map((item: PlanningItem) => this.dividePlanningItemInDays(item))
				.reduce((acc, val) => acc.concat(val), [])
				.map((item: PlanningItem) => {
					if (
						dateTime.hasSame(
							PlanningHelpers.dateModelToDateTime(item.startDate),
							'week',
						)
					) {
						return item
					}
				})
				.forEach((item: PlanningItem) => {
					if (!item) return

					const dayExists = days.find(
						(day) =>
							day.date.day === item.startDate.day &&
							day.date.month === item.startDate.month &&
							day.date.year === item.startDate.year,
					)

					if (dayExists) {
						dayExists.items.push(item)
					} else {
						const planningDay = new PlanningDay({
							date: item.startDate,
						})

						planningDay.items.push(item)
						days.push(planningDay)
					}
				})

			const arr = days
				.map((day) => {
					const newDay = { ...day }
					const itemsWithPosition = this.addPositionToPlanningItems(
						day.items,
						pixelsPerMinute,
						timelineElments,
					)
					newDay.itemsByDay = this.divideOverlappingPlanningItems(itemsWithPosition)

					return newDay
				})
				.sort((a, b) => {
					const aStartDate = PlanningHelpers.dateModelToDateTime(a.date)
					const bStartDate = PlanningHelpers.dateModelToDateTime(b.date)

					return aStartDate.toMillis() - bStartDate.toMillis()
				})

			resolve(arr)
		})
	}

	private addPositionToPlanningItems(
		items: PlanningItem[],
		pixelsPerMinute: number,
		timelineElments: TimelineElements,
	): PlanningItem[] {
		return items.map((item: PlanningItem) => {
			const { startDate, endDate } = item

			const startTime = PlanningHelpers.dateTime().set({
				hour: startDate.hour,
				minute: startDate.minute,
			})
			const endTime = PlanningHelpers.dateTime().set({
				hour: endDate.hour,
				minute: endDate.minute,
			})

			const duration = endTime.diff(startTime, 'minutes')
			const minuteDistanceStart = pixelsPerMinute * startTime.minute
			const width = duration.minutes * pixelsPerMinute

			const { startEl } = this.getTimeEl(
				startDate.hour.toString(),
				endDate.hour.toString(),
				timelineElments?.hours?.element,
			)

			const leftPos =
				startEl.offsetLeft +
				minuteDistanceStart -
				this.replaceSizeUnit(timelineElments.timeSlotSize)

			const newItem = { ...item }
			newItem.leftPos = leftPos + 'px'
			newItem.width = width + 'px'

			return newItem
		})
	}

	private replaceSizeUnit(value: string): number {
		return parseFloat(value.replace('px', '').replace('em', '').replace('rem', ''))
	}

	public getTimeEl(start: string, end: string, hours: HTMLElement): PlanningTimeElement {
		if (start === undefined && end === undefined) {
			return new PlanningTimeElement()
		}

		const startTime = hours.querySelector(`div[data-x-hour="${start}"]`)
		const endTime = hours.querySelector(`div[data-x-hour="${end}"]`)

		const startEl = startTime as HTMLElement
		const endEl = endTime as HTMLElement

		return new PlanningTimeElement({
			startEl,
			endEl,
		})
	}

	/**
	 * If an Planning Item has the end date on a next day, it will be divided into more days
	 * @param item single PlanningItem
	 *
	 * @returns PlanningItem[]
	 */
	private dividePlanningItemInDays(item: PlanningItem): PlanningItem[] {
		if (!item) return

		const startDate = PlanningHelpers.dateModelToDateTime(item.startDate)
		const endDate = PlanningHelpers.dateModelToDateTime(item.endDate)

		const daysAmount = endDate.diff(startDate, 'days')
		const amount = Math.floor(daysAmount.days * 10)
		const days = amount === 1 ? amount + 1 : amount
		let newArr = null

		if (!startDate.hasSame(endDate, 'day')) {
			newArr = Array(days)
				.fill(0)
				.map((_, idx) => {
					let planningItem = null
					if (idx === 0) {
						planningItem = new PlanningItem({ ...item })
						const endDate = PlanningHelpers.dateModelToDateTime(item.startDate).set({
							hour: 23,
							minute: 59,
						})
						planningItem.endDate = new PlanningItemDate(endDate)
					} else {
						const newStartDate = PlanningHelpers.dateModelToDateTime(item.startDate)
							.set({ hour: 0, minute: 0 })
							.plus({ day: idx })

						const newEndDate = newStartDate.hasSame(endDate, 'day')
							? newStartDate.set({
									hour: endDate.hour,
									minute: endDate.minute,
									day: endDate.day,
							  })
							: newStartDate.set({ hour: 23, minute: 59, day: endDate.day })

						planningItem = new PlanningItem({ ...item })
						planningItem.startDate = new PlanningItemDate(newStartDate)
						planningItem.endDate = new PlanningItemDate(newEndDate)
					}
					return planningItem
				})
		}

		return Array.isArray(newArr) ? newArr : [item]
	}

	/**
	 * Divide an Array of Planning Items into a multi dimensional array of Planning based on days
	 * @param item Array of PlanningItem[]
	 *
	 * @return Array of PlanningItem[][]
	 */
	public divideOverlappingPlanningItems(items: PlanningItem[]): PlanningItem[][] {
		if (items.length === 0) return []

		const arr: PlanningItem[][] = []

		for (const item of items) {
			let overlap = false
			let index = 0

			if (arr.length > 0) {
				for (const value of arr) {
					overlap = this.checkOverlap(value, item.startDate, item.endDate)

					if (overlap) {
						index++
					} else {
						break
					}
				}
			}

			const currentMapItem = arr[index]
			if (!currentMapItem || overlap) {
				const firstItem = [{ ...item }]
				arr.push(firstItem)
			} else {
				arr[index].push({ ...item })
				arr[index].sort((a, b) => a.startDate.hour - b.startDate.hour)
			}
		}

		return arr
	}

	private checkOverlap(
		value: PlanningItem[],
		startDate: PlanningItemDate,
		endDate: PlanningItemDate,
	): boolean {
		return this.timeOverlap(value, startDate, endDate).length !== 0
	}

	/**
	 * Check if time is overlapping
	 * @param arr Array of PlanningItem
	 * @param startTime start time
	 * @param endTime end time
	 */
	private timeOverlap(
		arr: PlanningItem[],
		startDate: PlanningItemDate,
		endDate: PlanningItemDate,
	) {
		if (!arr) return []
		const intersectionTimes = this.timeRange(startDate, endDate)

		try {
			return arr.filter((element) => {
				const checkItem = this.timeRange(element.startDate, element.endDate)
				const mergedChecks = intersectionTimes.concat(checkItem)

				const hasDuplicates = new Set([...mergedChecks]).size !== mergedChecks.length

				return hasDuplicates
			})
		} catch (error) {
			return []
		}
	}

	/**
	 * Returns an array of numbers from start to end
	 * @param start number
	 * @param end number
	 *
	 * @return string array with "01:00"
	 */
	public timeRange(start: PlanningItemDate, end: PlanningItemDate, type?: TimeRange): string[] {
		if (start === undefined || end === undefined) return []
		if (!start || !end) return

		const startDT = PlanningHelpers.dateModelToDateTime(start)
		const endDT = PlanningHelpers.dateModelToDateTime(end)

		const am = endDT.diff(startDT, type === TimeRange.hours ? 'hours' : 'minutes')

		const newArr = Array(am.minutes)
			.fill(am.minutes)
			.map((_, idx) => {
				const date = startDT.plus({ minute: idx })

				return `${date.hour}:${date.minute}`
			})

		return newArr
	}

	/**
	 * Generate Shifts for 24 hours
	 * @param start DateTime
	 * @param amount amount of shifts
	 */
	public generateShifts(start: DateTime, amount: number): PlanningShift[] {
		const end = start.set({ hour: 23, minute: 59 })
		const totalDayHours = end.diff(start, 'hours').hours
		const shiftDuration = totalDayHours / amount

		return Array.from(Array(amount), (_, index) => {
			const iterationTime = start.plus({ hour: shiftDuration * index })
			const startTime = index > 0 ? iterationTime.hour : start.hour
			const endTime = iterationTime.plus({ hour: shiftDuration }).hour

			return new PlanningShift({
				startTime,
				endTime,
				duration: shiftDuration,
			})
		})
	}

	/**
	 * Generate planning items
	 * @param currentDate DateTime
	 */
	public generatePlanningItems(currentDate: DateTime): PlanningItem[] {
		return Array.from(Array(10), (_, index) => {
			const date = currentDate.plus({
				hours: index + rndNum(0, 16),
				minute: rndNum(0, 59),
			})

			const start = date
			const end = date.plus({ hours: 2 + rndNum(0, 3), minute: rndNum(0, 59) })

			const startHour = start.hour
			const endHour = end.hour

			if (end.toMillis() < start.toMillis()) {
				end.plus({ day: 1 })
			}

			const startDate = new PlanningItemDate({
				day: start.day,
				month: start.month,
				year: start.year,
				hour: startHour,
				minute: start.minute,
				second: start.second,
			})

			const endDate = new PlanningItemDate({
				day: end.day,
				month: end.month,
				year: end.year,
				hour: endHour,
				minute: end.minute,
				second: end.second,
			})

			const color = PlanningHelpers.randomColorRgb()

			return new PlanningItem({
				startDate,
				endDate,
				status: 'concept',
				color,
				dependencies: [],
				resources: [],
				location: null,
				duration: null,
			})
		}).sort((a, b) => a.startDate.hour - b.startDate.hour)
	}

	/**
	 * Generate Planning Items fro a week
	 */
	public generatePlanningItemsWeek(globalDate: Date): Promise<any[]> {
		return new Promise((resolve, reject) => {
			const date = DateTime.fromJSDate(globalDate).startOf('week')
			const weekArr = Array.from(Array(7), (_, index) =>
				this.generatePlanningItems(date.plus({ day: index })),
			)

			const result = [...weekArr]
				.reduce((acc, val) => acc.concat(val), [])
				.map((item: PlanningItem, idx: number) => {
					const plannigItem = new PlanningItem({ ...item })
					plannigItem.id = `${idx}`
					return plannigItem
				})

			resolve(result)
		})
	}

	/**
	 * Random number
	 */
	public randomNumber(): number {
		const number = [0, 7, 25, 14, 27, 39, 67, 88, 100][Math.round(Math.random() * 9)]
		return number === undefined || number === null ? 0 : number
	}
}
