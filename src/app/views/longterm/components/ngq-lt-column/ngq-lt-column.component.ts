import { Component, OnInit, Input } from '@angular/core'

/**
 * This component is used in the ngq-longterm component to create the scrolable columns.
 * You can add a title for the vertical bar, a number for the user to show which step is active and the width so every column can have it's own width
 */
@Component({
	selector: 'ngq-lt-column',
	templateUrl: './ngq-lt-column.component.html',
	styleUrls: ['./ngq-lt-column.component.scss'],
})
export class NgqLtColumnComponent implements OnInit {
	@Input() title: string = ''
	@Input() width: string = ''
	@Input() number: string = ''

	public visible = true

	constructor() {}

	ngOnInit(): void {}

	toggle() {
		this.visible = !this.visible
	}
}
