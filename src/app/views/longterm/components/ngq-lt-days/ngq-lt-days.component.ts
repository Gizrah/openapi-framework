import { Component, OnInit, Input, SimpleChanges, OnChanges } from '@angular/core'

export class LtDay {
	name = ''
	key = ''
	color? = ''

	constructor(data: any) {
		this.name = data.name
		this.key = data.key
		this.color = data.color
	}
}

/**
 * This component is used to display the days in the waitinglist component
 */
@Component({
	selector: 'ngq-lt-days',
	templateUrl: './ngq-lt-days.component.html',
	styleUrls: ['./ngq-lt-days.component.scss'],
})
export class NgqLtDaysComponent implements OnInit, OnChanges {
	@Input() days: LtDay[] = []

	public daysList: LtDay[] = []

	private dayColors = {
		ma: '175,144,217',
		di: '216,138,222',
		wo: '188,131,131',
		do: '221,100,100',
		vr: '245,180,91',
		za: '248,236,88',
		zo: '152,214,80',
	}

	constructor() {}

	ngOnInit(): void {
		this.daysList = this.generateDays()
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes.days) {
			this.daysList = this.generateDays()
		}
	}

	private generateDays(): any[] {
		return this.days.map((day: LtDay) => {
			return { ...day, color: this.dayColors[day.name] ?? '255,255,255' }
		})
	}
}
