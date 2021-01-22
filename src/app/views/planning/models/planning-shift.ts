export class PlanningShift {
	public startTime: number
	public endTime: number
	public duration: number
	public leftPos?: string
	public width?: string

	constructor(input) {
		this.startTime = input.startTime
		this.endTime = input.endTime
		this.duration = input.duration
		this.width = input.width
		this.leftPos = input.leftPos
	}
}
