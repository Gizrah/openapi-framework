import { Component, EventEmitter, Input, Output } from '@angular/core'
import { OpenApi } from '@quebble/openapi'
import { asArray, hasValue, Methods } from '@quebble/scripts'

@Component({
	selector: 'ngq-avatar-row',
	template: `
		<div class="avatar_row">
			<div
				*ngFor="let item of items"
				[class.avatar_row-item]="selected !== item[id]"
				[class.avatar_row-item-selected]="selected === item[id]"
				(click)="select(item)"
			>
				<div class="avatar_row-avatar" [style.width]="size" [style.height]="size">
					<ng-template [ngIf]="avatar && item[avatar]" [ngIfElse]="fallback">
						<div class="avatar_row-avatar-image">
							<img [src]="item[avatar]" />
						</div>
					</ng-template>

					<ng-template #fallback>
						<div
							class="avatar_row-avatar-icon"
							[style.fontSize]="iconsize"
							*ngIf="hasgender"
						>
							<ng-container [ngSwitch]="item[gender]">
								<i class="fa fa-user" *ngSwitchCase="0"></i>
								<i class="fa fa-male" *ngSwitchCase="1"></i>
								<i class="fa fa-female" *ngSwitchCase="2"></i>
								<i class="fa fa-genderless" *ngSwitchCase="3"></i>
								<i class="fa fa-{{ fallback }}" *ngSwitchDefault></i>
							</ng-container>
						</div>
						<div
							class="avatar_row-avatar-icon"
							[style.fontSize]="iconsize"
							*ngIf="!hasgender && !!fallback"
						>
							<i class="fa fa-{{ fbicon }}"></i>
						</div>
					</ng-template>
				</div>

				<div class="avatar_row-subject">
					<ng-template [ngIf]="item[label]">
						<div class="avatar_row-link">
							{{ item[label] | translink }}
						</div>
					</ng-template>
				</div>
			</div>
		</div>
	`,
	styleUrls: ['./ngq-avatar-row.component.scss'],
})
export class NgqAvatarRowComponent {
	@Input() public items: any[] = []
	@Input() public avatar: string = 'avatar'
	@Input() public subject: string
	@Input() public gender: string = 'gender'
	@Input() public fallback: string = 'user-circle-o'
	@Input() public id: string = 'id'

	@Output('select') public selectemit: EventEmitter<any> = new EventEmitter()

	@Input('selected') set currently(select: any) {
		if (hasValue(select)) this.selected = select
	}

	@Input('size') set setupSize(size: any) {
		if (hasValue(size)) {
			const justInt = parseFloat(size)
			const clean = String(size).replace(String(justInt), '')
			const tuple = [3, 'em']
			if (!clean.length) tuple[0] = size
			else {
				const parsed = Methods.ParseSize(size)
				tuple[0] = parsed[0]
				tuple[1] = parsed[1]
			}

			this._size = tuple.join('')
		} else {
			this._size = null
		}
	}
	get size(): any {
		return this._size
	}

	@Input('iconsize') set setupIconsize(size: any) {
		if (hasValue(size)) {
			const justInt = parseFloat(size)
			const clean = String(size).replace(String(justInt), '')
			const tuple = [1, 'em']
			if (!clean.length) tuple[0] = size
			else {
				const parsed = Methods.ParseSize(size)
				tuple[0] = parsed[0]
				tuple[1] = parsed[1]
			}

			this._iconsize = tuple.join('')
		} else {
			this._iconsize = null
		}
	}
	get iconsize(): string {
		return this._iconsize
	}

	private _size: string
	private _iconsize: string

	public selected: any = undefined

	constructor(private openapi: OpenApi.OpenApiService) {}

	get label(): string {
		return this.subject
	}

	get fbicon(): string {
		return this.fallback ?? 'user-cicle-o'
	}

	get hasgender(): boolean {
		return this.gender
			? asArray(this.items).every((item) => hasValue(item[this.gender]))
			: false
	}

	public select(item: any): void {
		this.selected = item ? item[this.id] : undefined
		this.selectemit.emit(hasValue(this.selected) ? item : undefined)
	}
}
