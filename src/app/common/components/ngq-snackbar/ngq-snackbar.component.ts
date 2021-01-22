import { Component, Inject } from '@angular/core'
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar'
import { TranslateService } from '@ngx-translate/core'
import { ResponseEventType } from '@quebble/enums'
import { ResponseEvent } from 'app/common/services/response/service/response.service'
import { Subscription } from 'rxjs'

interface SnackbarData {
	event: ResponseEvent
	params: Record<string, any>
	closable: boolean
}

interface ResponseTL {
	__title?: string
	__ec?: string
	__message?: string
	__description?: string
	__error?: string
	__success?: string
	__info?: string
	__warning?: string
}

@Component({
	selector: 'ngq-snackbar',
	template: `
		<div class="event_snackbar">
			<div class="event_snackbar-{{ type }}">
				<div class="event_snackbar-close" *ngIf="closeable">
					<ngq-button color="white-alt" icon="times" (click)="close()"></ngq-button>
				</div>
				<h3 *ngIf="tl.__title">{{ tl.__title }}</h3>
				<div *ngIf="tl.__message" class="event_snackbar-message">{{ tl.__message }}</div>
			</div>
			<div class="event_snackbar-ec">
				<ng-template [ngIf]="tl.__ec">
					{{ 'response.default.code.errorcode' | translink }} <span>{{ tl.__ec }}</span>
				</ng-template>
				<ng-template [ngIf]="extras">
					<ngq-button
						class="event_snackbar-toggle"
						mode="mini"
						color="accent-alt"
						[icon]="state ? 'eye-slash' : 'eye'"
						[matTooltip]="
							'response.default.code.' + (state ? 'hide' : 'show') | translink
						"
						(click)="toggle()"
					>
					</ngq-button>
				</ng-template>
			</div>

			<ng-template [ngIf]="state">
				<div *ngIf="tl.__description" class="event_snackbar-description">
					{{ tl.__description }}
				</div>

				<div *ngIf="tl.__error" class="event_snackbar-res">
					<ng-container
						*ngTemplateOutlet="rcomp; context: { rtype: 'error', prop: '__error' }"
					>
					</ng-container>
				</div>
				<div *ngIf="tl.__success" class="event_snackbar-res">
					<ng-container
						*ngTemplateOutlet="rcomp; context: { rtype: 'success', prop: '__success' }"
					>
					</ng-container>
				</div>
				<div *ngIf="tl.__info" class="event_snackbar-res">
					<ng-container
						*ngTemplateOutlet="rcomp; context: { rtype: 'info', prop: '__info' }"
					>
					</ng-container>
				</div>
				<div *ngIf="tl.__warning" class="event_snackbar-res">
					<ng-container
						*ngTemplateOutlet="rcomp; context: { rtype: 'warning', prop: '__warning' }"
					>
					</ng-container>
				</div>

				<div *ngIf="params.length" class="event_snackbar-params">
					<p>{{ 'response.default.code.params' | translink }}</p>
					<ng-container *ngFor="let pair of params">
						<div class="event_snackbar-param">
							<label>
								{{ 'response.default.code.' + pair[0] | translink }}
							</label>
							<span>{{ pair[1] }}</span>
						</div>
					</ng-container>
				</div>
			</ng-template>
		</div>

		<ng-template #rcomp let-rtype="rtype" let-prop="prop">
			<ngq-response [content]="tl[prop]" [type]="rtype"></ngq-response>
		</ng-template>
	`,
	styleUrls: ['./ngq-snackbar.component.scss'],
})
export class NgqSnackbarComponent {
	public type: ResponseEventType
	public tl: ResponseTL
	public state: boolean = false
	public closeable: boolean

	private _params: Record<string, any>
	private _extra: string[][]
	private _event: ResponseEvent

	private tl$: Subscription

	constructor(
		private snackbar: MatSnackBarRef<NgqSnackbarComponent>,
		private translate: TranslateService,
		@Inject(MAT_SNACK_BAR_DATA) private data: SnackbarData,
	) {
		const { event, params, closable } = this.data
		this._event = event
		this._params = params
		this.type = event?.type
		this.closeable = closable
	}

	get params(): string[][] {
		return this._extra ?? []
	}

	get extras(): boolean {
		return (
			!!this.tl?.__description ||
			!!this.tl?.__error ||
			!!this.tl?.__warning ||
			!!this.tl?.__success ||
			!!this.tl?.__info ||
			this.params.length > 0
		)
	}

	public ngOnInit(): void {
		this.getTranslations()
		this.setParams()
	}

	public ngOnDestroy(): void {
		this.tl$.unsubscribe()
	}

	public toggle(): void {
		this.state = !this.state
	}

	public close(): void {
		this.snackbar.dismiss()
	}

	private getTranslations(): void {
		const tlstring = `response.code.${this._event?.status ?? 'generic'}`
		this.tl$ = this.translate.get(tlstring).subscribe((tl: ResponseTL) => {
			this.tl = tl
		})
	}

	private setParams(): void {
		if (!this._params) {
			this._extra = undefined
			return
		}

		this._extra = Object.entries(this._params)
	}
}
