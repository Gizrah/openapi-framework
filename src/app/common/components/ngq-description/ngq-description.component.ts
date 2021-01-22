import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'

@Component({
	selector: 'ngq-description',
	template: `
		<div class="di-wrapper">
			<div class="di-title" *ngIf="title">
				<div class="di-title-text" [style.font-size]="textSize">
					{{ title }}
				</div>
			</div>
			<ng-content></ng-content>
		</div>
	`,
	styleUrls: ['./ngq-description.component.scss'],
})
export class NgqDescriptionComponent implements OnInit {
	@Input() public editable: boolean = false
	@Input() public title: string
	@Input() public size: string = '1'
	@Output() public edit = new EventEmitter<boolean>()

	get textSize(): string {
		return this.size + 'rem'
	}

	constructor() {}

	public ngOnInit(): void {}
}
