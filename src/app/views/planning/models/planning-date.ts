import { DateTime, Info } from 'luxon'

import { PlanningHelpers } from '../scripts/planning-helpers'
import { PlanningItemDate } from './planning-item'

export class GlobalPlanningDate {
	public day = 0
	public date = 0
	public month = 0
	public week = 0
	public year = 0
	public quarter = 0
	public unix = 0

	public minute = 0
	public hour = 0

	public time = ''

	public luxon: DateTime = null

	public weeks: number[]

	public months: string[]
	public monthsShort: string[]

	public hoursOfDay: IPlanningHours[]
	public daysOfWeek: PlanningItemDate[]

	constructor(date) {
		if (!date) {
			date = new Date()
		}
		const localDate = PlanningHelpers.jsDateToDateTime(date)
		// console.error(`Date ${date} `)
		if (!localDate.isValid) {
			console.error(`Date is not valid`)
			console.info(date)
		}
		this.day = localDate.day
		this.date = localDate.day
		this.month = localDate.month
		this.week = localDate.weekNumber
		this.year = localDate.year
		this.quarter = localDate.quarter
		this.minute = localDate.minute
		this.hour = localDate.hour
		this.time = `${this.minute}:${this.hour}`
		this.unix = localDate.toMillis()
		this.luxon = localDate

		this.months = Info.monthsFormat('long', { locale: 'nl-NL' })
		this.monthsShort = Info.monthsFormat('short', { locale: 'nl-NL' })

		this.daysOfWeek = this.getDatesInWeek(localDate)
		this.hoursOfDay = this.getHours()
	}

	public getHours(): IPlanningHours[] {
		return Array.from(Array(24), (_, i) => {
			const hour = `${i}`
			return {
				hour,
				minutes: '00',
			}
		})
	}

	public getDatesInWeek(date: DateTime): PlanningItemDate[] {
		const startWeek = date.startOf('week')
		return [...Array(7).keys()].map((_, i) => new PlanningItemDate(startWeek.plus({ day: i })))
	}

	public init(): Promise<GlobalPlanningDate> {
		return new Promise((resolve, reject) => {
			resolve(this)
		})
	}
}

interface IPlanningHours {
	hour: string
	minutes: string
}
