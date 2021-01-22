import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core'
import { OpenApi } from '@quebble/openapi'

interface INGQAction {
	icon: string | string[]
	color: string | string[]
	operation: OpenApi.Operation
}

@Component({
	selector: 'ngq-actions',
	template: `
		<div class="ngq-label-line" *ngIf="actions.length"></div>
		<ng-template [ngIf]="actions.length">
			<ng-container *ngFor="let action of actions">
				<ngq-button
					[icon]="action.icon"
					[color]="action.color"
					[shadow]="shade"
					(click)="select.emit(action.operation)"
					[mode]="mode"
				></ngq-button>
			</ng-container>
		</ng-template>

		<ng-content></ng-content>
	`,
	styleUrls: ['./ngq-actions.component.scss'],
})
export class NgqActionsComponent {
	@Input() public operations: OpenApi.Operation[]
	@Input() public shade: boolean = false
	@Input() public color: string
	@Input() public mode: string = 'normal'
	@Input('show-post') public post: boolean = false
	@Input('show-patch') public patch: boolean = true
	@Input('show-put') public put: boolean = true
	@Input('show-delete') public delete: boolean = true
	@Output() public select: EventEmitter<OpenApi.Operation> = new EventEmitter()

	public actions: INGQAction[] = []

	constructor() {}

	public ngOnChanges(changes: SimpleChanges): void {
		if (
			'operations' in changes ||
			'shade' in changes ||
			'color' in changes ||
			'post' in changes ||
			'patch' in changes ||
			'put' in changes ||
			'delete' in changes
		)
			this.mapIcons()
	}

	private mapIcons(): void {
		if (!this.operations?.length) {
			return
		}

		const show = [this.post, this.patch, this.put, this.delete]
		const order = ['post', 'patch', 'put', 'delete'].filter((a, i) => !!show[i])

		this.actions = order
			.map((method) => {
				const op = this.operations.find((op) => op.type === method)
				if (!op) return

				const action = {
					icon: null,
					color: null,
					operation: op,
				}

				switch (method) {
					case 'post':
						action.icon = 'plus'
						action.color = this.color ?? 'success-alt'
						break
					case 'patch':
						action.icon = 'pencil'
						action.color = this.color ?? 'info-alt'
						break
					case 'put':
						action.icon = ['pencil', 'forward']
						action.color = this.color ?? ['info-alt', 'accent-alt']
						break
					case 'delete':
						action.icon = 'trash-o'
						action.color = this.color ?? 'error-alt'
						break
				}

				return action
			})
			.filter((a) => !!a)
	}
}
