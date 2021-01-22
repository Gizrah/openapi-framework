import { DateTime } from 'luxon'

import { GlobalPlanningDate } from '../models/planning-date'
import { PlanningItemDate } from '../models/planning-item'

export namespace PlanningHelpers {
	export const addZeros = (number: number | string): string =>
		number < 10 ? `0${number}` : String(number)

	export const LOCALE_SHORT = 'nl'
	export const LOCALE = `${LOCALE_SHORT}-NL`

	export const dateTimeFormat = (date: Date, options?: any) => {
		let format = null
		if (options) {
			format = new Intl.DateTimeFormat(PlanningHelpers.LOCALE, options || null)
		} else {
			format = new Intl.DateTimeFormat(PlanningHelpers.LOCALE)
		}
		return format.format(date)
	}

	export const dateModelToDateTime = (date: PlanningItemDate | GlobalPlanningDate): DateTime =>
		DateTime.fromObject({
			day: date.day,
			month: date.month,
			year: date.year,
			hour: date.hour,
			minute: date.minute,
		}).setLocale(LOCALE)

	export const jsDateToDateTime = (date: Date): DateTime =>
		DateTime.fromJSDate(date).setLocale(LOCALE)

	export const dateTime = (): DateTime => DateTime.local().setLocale(LOCALE)

	export const randomColor = (): string => Math.floor(Math.random() * 16777215).toString(16)
	export const randomColorRgb = (): string =>
		Array(3)
			.fill(0)
			.map(() => ~~(Math.random() * 255))
			.toString()

	export const remToPx = (size: string, rootFontSize: number): number | string => {
		const sizeNumber = parseFloat(size)
		if (!isNaN(sizeNumber)) {
			const numberPos = sizeNumber.toString().indexOf(sizeNumber.toString())
			const unit = size.substring(numberPos + sizeNumber.toString().length)

			return unit === 'em' || unit === 'rem' ? sizeNumber * rootFontSize : sizeNumber
		} else {
			return size
		}
	}

	export const calculateString = (calculation: string) => new Function('return ' + calculation)()

	export const replaceSizeUnit = (value: string): number =>
		parseFloat(value.replace('px', '').replace('em', '').replace('rem', ''))
}
