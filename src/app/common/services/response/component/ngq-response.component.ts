import { Component, HostBinding, Input, OnDestroy, SimpleChanges } from '@angular/core'
import { ResponseEventType } from '@quebble/enums'
import { Subject, Subscription } from 'rxjs'
import { filter, tap } from 'rxjs/operators'

import { ResponseModel } from '../model/response.model'
import { ResponseService } from '../service/response.service'

@Component({
	selector: 'ngq-response',
	template: `
		<ng-template [ngIf]="!!watch">
			<div *ngIf="message?.message" class="ngq_response-wrap ngq_response-{{ message.type }}">
				<i class="fa fa-{{ message.icon }}"></i>
				<span>{{ message.message | translink: message.params }}</span>
			</div>
		</ng-template>

		<ng-template [ngIf]="!watch && !!content && !!message">
			<div class="ngq_response-wrap ngq_response-{{ message.type }}">
				<i class="fa fa-{{ message.icon }}"></i>
				<span>{{ message.message | translink: message.params }}</span>
			</div>
		</ng-template>
	`,
	styleUrls: ['./ngq-response.component.scss'],
})
export class NgqResponseComponent implements OnDestroy {
	@Input()
	set watch(watch: string | string[]) {
		if (watch) {
			this.initSubscription(watch)
		} else {
			if (this.sub$) this.sub$.unsubscribe()
		}
	}
	@Input()
	set type(type: ResponseEventType) {
		if (type && this.message) {
			this.message.type = type
		} else {
			this._type = type
		}
	}

	@Input() set content(content: string) {
		this._content = content
	}
	get content(): string {
		return this._content
	}

	public message: ResponseModel

	private _content: string
	private _type: ResponseEventType

	private sub$: Subscription
	private destroy$: Subject<void> = new Subject()

	constructor(private response: ResponseService) {}

	public ngOnChanges(changes: SimpleChanges): void {
		if ('type' in changes && 'content' in changes && !this.watch) {
			if (this._type && this.content) {
				const model = new ResponseModel()
				model.message = this._content
				model.type = this._type

				this.message = model
			}
		}
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
	}

	public setMessage(message: ResponseModel): void {
		this.message = message as any
	}

	private initSubscription(watch: string | string[]): void {
		if (this.sub$) this.sub$.unsubscribe()

		this.sub$ = this.response
			.get<string | string[], ResponseModel>(watch)
			.pipe(
				tap(() => {
					this.message = null
				}),
				filter((message) => !!message),
			)
			.subscribe((message) => {
				this.message = new ResponseModel(message)
			})
	}

	@HostBinding('class.ngq_response')
	public __componentClass: boolean = true
}
