interface ITimelineElement {
	element: HTMLElement
	date?: TimelineElementDate
	children: TimelineChildElement[]
}

export class TimelineElement {
	element: HTMLElement = null
	date?: TimelineElementDate = null
	children: TimelineChildElement[] = []

	constructor(attr?: ITimelineElement) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}

interface ITimelineElementDate {
	date: string
	month: string
	year: number
	day: string
}

export class TimelineElementDate {
	date = ''
	month = ''
	year = 0
	day = ''

	constructor(attr?: ITimelineElementDate) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}

interface ITimelineElementTime {
	hour: string
	minute: string
}
export class TimelineElementTime {
	hour? = ''
	minute? = ''

	constructor(attr?: ITimelineElementTime) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}

export class TimelineChildElement {
	element: HTMLElement = null
	hour?: string = ''
	minute?: string = ''

	constructor(attr?) {
		// console.dir(attr.element)
		if (attr?.element) {
			const { xHour, xMinute } = attr.element.dataset

			this.element = attr.element
			this.hour = xHour
			this.minute = xMinute
		}
	}
}

interface ITimelineElements {
	hours: ITimelineElement
	gridContainer: ITimelineElement
	gridWrapper: ITimelineElement
}

export class TimelineElements {
	hours: TimelineElement = new TimelineElement()
	gridContainer: TimelineElement = new TimelineElement()
	gridWrapper: TimelineElement = new TimelineElement()
	timeSlotSize: string = ''

	constructor(attr?: ITimelineElements) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}
