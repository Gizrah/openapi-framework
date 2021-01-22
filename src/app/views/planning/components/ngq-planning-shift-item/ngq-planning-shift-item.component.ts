import { Component, OnInit } from '@angular/core'

import { PlanningShiftService, ShiftTotal } from '../../services/planning-shift.service'

@Component({
	selector: 'ngq-planning-shift-item',
	templateUrl: './ngq-planning-shift-item.component.html',
	styleUrls: ['./ngq-planning-shift-item.component.scss'],
})
export class NgqPlanningShiftItemComponent implements OnInit {
	public shiftTotal: ShiftTotal = null

	constructor(private shift: PlanningShiftService) {}

	public ngOnInit(): void {
		this.shiftTotal = new ShiftTotal({
			groups: this.shift.shiftGroups,
		})
	}
}
