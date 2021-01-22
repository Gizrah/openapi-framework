import { Component, Input, OnInit } from '@angular/core'

import { PlanableItem } from '../../models/planable-items'

@Component({
	selector: 'ngq-planning-sidebar',
	templateUrl: './ngq-planning-sidebar.component.html',
	styleUrls: ['./ngq-planning-sidebar.component.scss'],
})
export class NgqPlanningSidebarComponent implements OnInit {
	@Input() set items(n: PlanableItem[]) {
		this._items = n
		this.modifiedItems = this._items
	}

	get items() {
		return this._items
	}
	private _items: PlanableItem[] = []

	public modifiedItems: PlanableItem[] = []
	public displayedColumns: string[] = ['name', 'overPlanned', 'toPlan']

	constructor() {}

	public ngOnInit(): void {
		// Sort by .toPlan, lowest first with .sort(), with reverse highest first
		this.modifiedItems = this.items.sort((a, b) => a.toPlan - b.toPlan).reverse()
	}
}
