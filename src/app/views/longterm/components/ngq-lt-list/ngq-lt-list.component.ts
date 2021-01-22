import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core'
import { hasValue } from '@quebble/scripts'

export class LtListItem {
	name = ''
	id = ''
	days?: any[]
	avatar? = ''

	constructor(data: any) {
		this.name = data.name
		this.id = data.id
		if (data.days) {
			this.days = data.days
		}
		if (data.avatar) {
			this.avatar = data.avatar
		}
	}
}

/**
 * Component for showing a list of properties. This component is used in the column component.
 */
@Component({
	selector: 'ngq-lt-list',
	templateUrl: './ngq-lt-list.component.html',
	styleUrls: ['./ngq-lt-list.component.scss'],
})
export class NgqLtListComponent implements OnInit {
	@Input() public id: string = 'id'
	@Input() public items: LtListItem[] = []
	@Output('select') public selectItem: EventEmitter<LtListItem> = new EventEmitter()

	@Input('selected') set currently(select: string) {
		if (hasValue(select)) this.selected = select
	}

	public selected: string = null

	constructor() {}

	ngOnInit(): void {}

	public select(item: LtListItem): void {
		if (item?.id === this.selected) {
			this.selected = null
			this.selectItem.emit(null)
		} else {
			this.selected = item ? item[this.id] : null
			this.selectItem.emit(this.selected ? item : null)
		}
	}
}
