export class PlanningTimeElement {
	public startEl: HTMLElement = null
	public endEl: HTMLElement = null

	constructor(data?) {
		this.startEl = data.startEl
		this.endEl = data.endEl
	}
}

export enum TimeRange {
	hours = 0,
	minutes = 60,
}
