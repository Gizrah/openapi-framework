import {
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnInit,
	Output,
	Renderer2,
	ViewChild,
} from '@angular/core'
import { StorageKeys } from '@quebble/consts'
import { environment } from '@quebble/environment'
import { NgqFieldConfig } from '@quebble/formly'
import { OpenApi } from '@quebble/openapi'
import { asArray, hasValue, Methods } from '@quebble/scripts'
import { StorageService } from '@quebble/services'
import { Subscription } from 'rxjs'
import { filter, pluck } from 'rxjs/operators'

type FormId = string
type Percentage = number
type Multiplier = number

@Component({
	selector: 'ngq-rest-dialog-bar',
	template: `
		<ng-template [ngIf]="fields.length > 2">
			<div class="ngq_dialog_bar-indicator" #indicator></div>
		</ng-template>

		<ng-template [ngIf]="fields.length">
			<div #initial>
				<ngq-button
					size="0.85em"
					[icon]="['th-list', !!active ? 'arrow-left' : 'arrow-down']"
					[color]="['info-alt', 'success-alt', 'primary-alt']"
					(click)="toBase()"
					(dblclick)="__log()"
					matTooltip="::DEV:: Double click to log NgqRestDialogBarComponent to console"
					[matTooltipDisabled]="!devmode"
					[inactive]="!active"
					#initial
				>
					<ng-container
						*ngTemplateOutlet="label; context: { field: fields[0] }"
					></ng-container>
				</ngq-button>
			</div>

			<div *ngIf="fields.length > 1" #items>
				<ng-container *ngFor="let field of fields; let index = index">
					<ng-template [ngIf]="index > 0">
						<div class="ngq_dialog_bar-item">
							<div class="ngq_dialog_bar-divider">
								<i class="fa fa-chevron-right"></i>
							</div>
							<div>
								<span
									[class.ngq_dialog_bar-active]="field.id === active"
									(click)="toField(field, index)"
								>
									<ng-container
										*ngTemplateOutlet="label; context: { field: field }"
									></ng-container>
								</span>
							</div>
						</div>
					</ng-template>
				</ng-container>
			</div>
		</ng-template>

		<ng-template #label let-field="field">
			{{
				field.templateOptions.label || field.ngqOptions.label || field.ngqOptions.tlstring
					| translink
			}}
		</ng-template>
	`,
	styleUrls: ['./ngq-rest-dialog-bar.component.scss'],
})
export class NgqRestDialogBarComponent implements OnInit {
	@Input() public formId: string
	@Output() public scrollto: EventEmitter<number> = new EventEmitter()

	@ViewChild('indicator', { static: false })
	private _indicator: ElementRef<HTMLElement>

	@ViewChild('initial', { static: false })
	private _initial: ElementRef<HTMLElement>

	@ViewChild('items', { static: false })
	private _items: ElementRef<HTMLElement>

	public fields: NgqFieldConfig[] = []

	public active: string
	private _leftpad: number
	private _fontsize: number = Methods.FontSize()
	private _quarter: number

	private scrollpoll$: Subscription
	private fieldpoll$: Subscription

	constructor(
		private formly: OpenApi.OpenApiFormlyService,
		private storage: StorageService,
		private render: Renderer2,
		private elRef: ElementRef,
	) {}

	public ngOnInit(): void {
		this._leftpad = parseInt(window.getComputedStyle(this.elRef.nativeElement).paddingLeft)
		this._quarter = this._fontsize / 4

		this.fieldPolling()
		this.scrollPolling()
	}

	public ngOnDestroy(): void {
		this.scrollpoll$.unsubscribe()
		this.fieldpoll$.unsubscribe()
	}

	private fieldPolling(): void {
		this.fieldpoll$ = this.storage.cache
			.get<Record<string, NgqFieldConfig[]>>(StorageKeys.Form.Fields)
			.pipe(
				filter((fields) => !!fields && hasValue(fields[this.formId])),
				pluck(this.formId),
			)
			.subscribe((fields: NgqFieldConfig[]) => (this.fields = asArray(fields)))
	}

	private scrollPolling(): void {
		const scrollpoll = this.storage.cache
			.get<[FormId, Multiplier, Percentage]>(StorageKeys.Dialog.ScrollPoll)
			.pipe(
				filter(
					(items) =>
						!!this._indicator &&
						this.fields.length > 2 &&
						!!items &&
						items[0] === this.formId,
				),
			)

		const activate = (i: number) => {
			const id = this.fields[i].id
			if (this.active !== id) this.active = id
		}

		this.scrollpoll$ = scrollpoll.subscribe(([, depth, percent]) => {
			const initial = this._initial.nativeElement
			const items = this._items.nativeElement.children

			const start = (100 - percent) / 100
			const end = percent / 100
			const move = percent > 5 && percent < 95
			const stuck = percent > 0 && percent <= 5
			const idx = depth - 1
			const initvis =
				depth - 2 === -1 || (depth - 2 < 1 && ((!stuck && move) || (stuck && !move)))

			let width = 0
			let left = this._leftpad

			if ((initvis && !move) || (initvis && stuck)) {
				width = initial.clientWidth
				left = this._leftpad
			} else if (initvis && move) {
				width = initial.clientWidth * start
				left = this._leftpad + initial.clientWidth * end
			} else if (!initvis) left = this._leftpad + initial.clientWidth

			for (let i = 0; i <= idx; i++) {
				if (!items[i]) {
					width = 0
					break
				}
				const full = items[i].clientWidth
				const chev = items[i].children.item(0)?.clientWidth
				const nochev = items[i].children.item(1)?.clientWidth

				if (initvis) {
					// If the init is visible
					if (move) {
						// And we're scrollin'
						if (i === 0 && idx > i) {
							// if this isnt the last item make
							// sure the next one is the last.
							// add the entire width
							width = width + full
							// this item is in focus
							activate(i)
						} else if (i === 1) {
							// otherwise, if the next one's the last
							// add the in-view width
							const partial = full * end
							width = width + partial
						}
					} else {
						// If we're not scrolling
						// That means we're looking at the
						// most left 2 items
						if (i === 0) {
							// If this is the first in the list
							// add the full width
							width = width + full
						}
					}
				} else {
					// If the first item isn't visible
					if (move) {
						// And we're scollin'
						if (i + 2 === idx) {
							// And if the item after the next
							// is the last, add the in-view width
							// of this item
							const partial = nochev * start
							width = width + partial - chev

							// since we know this is the earliest visible
							// item, add the current left state to left
							left = left + chev + full * end
						}

						if (i + 1 === idx) {
							// If the next one's the last
							// Add the entire width
							width = width + full

							// this item is in focus if 45% of
							// last is visible
							if (percent < 45) activate(i)
						}

						if (i === idx) {
							// If this is the last one,
							// Add the in-view width
							const partial = full * end
							width = width + partial
							// this item is visible for more than 45%
							if (percent >= 45) activate(i)
						}
					} else {
						// If we're not scrolling
						const prev = i > 0 ? items[i - 1].clientWidth : 0

						if ((stuck && i + 2 === idx) || (!stuck && i + 1 === idx)) {
							// Still sticky < 5 % movement
							// and check if the one after next is
							// the last or not stuck and next is
							// is last

							// We want to ignore the chevron left
							// of the text
							width = width + nochev
							// Make sure the left position does have
							// the chevron value though
							left = left + prev + chev
						} else if ((stuck && i + 1 === idx) || (!stuck && i === idx)) {
							width = width + full
							// Item is visible if before-last and
							// last is < 45% visible
							// or item is last and > 45% visible
							if (i === idx && percent >= 45) activate(i)
							if (i + 1 === idx && percent < 45) activate(i)
						}
					}
				}
			}

			if (width > 0) {
				if (initvis && (stuck || !move)) {
					left = left + this._quarter
					width = width - this._quarter
				}

				const indicator = this._indicator.nativeElement
				this.render.setStyle(indicator, 'width', Math.ceil(width) + 'px')
				this.render.setStyle(indicator, 'left', Math.ceil(left) + 'px')
			}
		})
	}

	public toField(field: NgqFieldConfig, index: number): void {
		if (field.id === this.active) return

		this.scrollto.emit(index + 1)
		this.active = field.id
	}

	public toBase(): void {
		this.scrollto.emit(1)
		this.active = undefined
	}

	// ::DEV::
	get devmode(): boolean {
		return !environment.production
	}

	public __log(): void {
		if (this.devmode) console.log(this)
	}
}
