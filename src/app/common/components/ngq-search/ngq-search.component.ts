import { animate, style, transition, trigger } from '@angular/animations'
import { debounceTime, filter, map, switchMap, takeUntil, withLatestFrom } from 'rxjs/operators'

import {
	Component,
	ElementRef,
	EventEmitter,
	HostBinding,
	Input,
	OnDestroy,
	OnInit,
	Output,
	ViewChild,
} from '@angular/core'
import { FadeInOutAnimation } from '@quebble/animations'
import { StorageKeys } from '@quebble/consts'
import { ResponseModel } from '@quebble/models'
import { OpenApi } from '@quebble/openapi'
import { childOf, hasValue } from '@quebble/scripts'
import { ResponseService, StorageService, TransLinkService } from '@quebble/services'
import { BehaviorSubject, combineLatest, Observable, Subject, Subscription } from 'rxjs'

@Component({
	selector: 'ngq-search',
	animations: [
		trigger('enterLeaveAnim', [
			transition(':enter', [
				style({ width: 0 }),
				animate('0.2s ease-in-out', style({ width: '15em' })),
			]),
			transition(':leave', [
				style({ width: '15em' }),
				animate('0.2s ease-in-out', style({ width: 0 })),
			]),
		]),
		...FadeInOutAnimation,
	],
	template: `
		<div class="ngq_search" *ngIf="type === 'bar'">
			<div
				*ngIf="show"
				class="ngq_search-field"
				[class.ngq_search-field-embedded]="mode !== 'default'"
				[@enterLeaveAnim]
			>
				<input class="ngq_search-input" [(ngModel)]="value" #inputfield />
				<ngq-button
					[icon]="value ? 'times' : 'search'"
					[loading]="operation.id"
					[inactive]="!value"
					mode="mini"
					color="grey-alt"
					class="ngq_search-action"
					(click)="value ? clear() : emit()"
				></ngq-button>
			</div>
			<ngq-response
				[watch]="seed"
				class="ngq_search-response"
				*ngIf="show"
				[@fadeInOut]
			></ngq-response>

			<div class="ngq_search-icon">
				<ngq-button
					icon="search"
					[color]="togglecolor"
					[mode]="togglemode"
					(click)="toggle()"
				></ngq-button>
			</div>
		</div>

		<div class="ngq_search-list" *ngIf="type === 'list' && show">
			<div class="ngq_search-field" [matTooltip]="message">
				<mat-form-field appearance="outline">
					<input matInput class="ngq_search-input" [(ngModel)]="value" #inputfield />
					<span
						class="ngq_search-shadow"
						[style.maxWidth]="maxwidth ? maxwidth + 'px' : null"
					>
						<span>{{ value }}</span>
						<ngq-button
							[icon]="'times'"
							[loading]="operation?.id"
							[inactive]="!value"
							mode="mini"
							color="grey-alt"
							class="ngq_search-clear"
							(click)="clear()"
							*ngIf="!!value"
						></ngq-button>
					</span>
					<ngq-button
						[icon]="'search'"
						[inactive]="!value"
						mode="mini"
						color="grey-alt"
						class="ngq_search-action"
						(click)="emit()"
					></ngq-button>
				</mat-form-field>
			</div>
		</div>
	`,
	styleUrls: ['./ngq-search.component.scss'],
})
export class NgqSearchComponent implements OnInit, OnDestroy {
	@ViewChild('inputfield', { static: false })
	set inputField(element: ElementRef<HTMLInputElement>) {
		if (element) {
			setTimeout(() => {
				this.maxwidth = element.nativeElement.clientWidth
				if (this.focus) element.nativeElement.focus()
			}, 150)
		}
	}

	@Input() public focus: boolean = true
	@Input() public mode: 'default' | 'embedded-dark' | 'embedded-light' = 'default'
	@Input() public type: 'bar' | 'list' = 'bar'
	@Input() public noop: boolean = false
	@Input('clear') public clearSearch: EventEmitter<any>

	@Input()
	set operation(operation: OpenApi.Operation) {
		this._operation = operation || new OpenApi.Operation()

		if (operation) {
			this.seed = `search-${this.operation.id}`
			this.operation$.next(`operation.operationId.${this.operation.id}`)
			this._param = operation?.params.find((param) => param.name === 'search')

			const schema: OpenApi.SchemaObject = this._param?.schema
			this._schema = schema

			if (schema) {
				this._show = false
				this.cleanRegex(schema.pattern)
				this.primeTranslations()
				this.setResponseModel()
			}
		}
	}
	get operation(): OpenApi.Operation {
		return this._operation
	}

	@Output() public search: EventEmitter<[OpenApi.ParameterObject, string]> = new EventEmitter()

	public seed: string
	public maxwidth: number

	private _show: boolean = false
	private _operation: OpenApi.Operation
	private _pattern: RegExp
	private _schema: OpenApi.SchemaObject
	private _param: OpenApi.ParameterObject
	private _message: ResponseModel
	private _wildcard: boolean = false

	private value$: BehaviorSubject<string> = new BehaviorSubject(null)
	private genericor$: Observable<string> = this.translate.get('generic.or')
	private operation$: BehaviorSubject<string> = new BehaviorSubject(null)
	private properties$: BehaviorSubject<string[]> = new BehaviorSubject([])
	private message$: BehaviorSubject<string> = new BehaviorSubject(null)
	private destroy$: Subject<void> = new Subject()
	private translation$: Subscription

	constructor(
		private storage: StorageService,
		private elRef: ElementRef<Node>,
		private openapi: OpenApi.OpenApiService,
		private translate: TransLinkService,
		private response: ResponseService,
	) {}

	set value(val: string) {
		this.value$.next(val)
	}

	get value(): string {
		return this.value$.getValue()
	}

	get show(): boolean {
		return this.type === 'list' ? !!this._param?.name || this.noop : this._show
	}

	get message(): any {
		return this._message?.message
	}

	get togglecolor(): string {
		switch (this.mode) {
			case 'default':
			case 'embedded-dark':
				return this.show ? 'accent' : 'white-alt'
			case 'embedded-light':
				return this.show ? 'accent' : 'primary-alt'
		}
	}

	get togglemode(): string {
		return this.mode === 'default' ? 'normal' : 'mini'
	}

	public ngOnInit(): void {
		this.primeSubscriptions()
		if (this.type === 'bar') this.primeWatcher()
		if (this.clearSearch) this.primeClear()
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
		this.response.clear(this.seed, true)
	}

	protected primeSubscriptions(): void {
		this.value$
			.pipe(
				debounceTime(300),
				filter((value) => {
					if (!hasValue(value) && value !== null) this.search.emit([this._param, null])
					return this.validate(value)
				}),
				takeUntil(this.destroy$),
			)
			.subscribe((value) => {
				this.search.emit([this._param, String(this._wildcard ? `${value}*` : value).trim()])
			})
	}

	private primeWatcher(): void {
		this.storage.cache
			.get<Element>(StorageKeys.Document.Click)
			.pipe(
				filter(() => this._show),
				filter((el: HTMLElement) => !childOf(this.elRef.nativeElement, el)),
				takeUntil(this.destroy$),
			)
			.subscribe(() => {
				this._show = false
			})
	}

	private primeClear(): void {
		this.clearSearch?.pipe(takeUntil(this.destroy$)).subscribe((val) => {
			this.clear()
		})
	}

	private primeTranslations(): void {
		if (this.translation$) this.translation$.unsubscribe()

		const combinetls = combineLatest([this.operation$, this.properties$]).pipe(
			filter(([ops, props]) => !!ops && !!props?.length),
			switchMap(([ops, props]) =>
				combineLatest([this.translate.get(ops), this.translate.get(props)]),
			),
		)

		this.translation$ = combineLatest([this.message$, this.genericor$])
			.pipe(
				withLatestFrom(combinetls),
				map(([[message, generic], [operation, properties]]) => {
					let props: string = ''
					if (typeof properties === 'object') {
						const vals = Object.values(properties)
						if (vals.length) {
							vals.map((prop: string) => prop.toLowerCase()).forEach(
								(prop, index) => {
									if (index === vals.length - 1) props += ` ${generic} ${prop}`
									else if (index > 0 && index < props.length - 1)
										props += `, ${prop}`
									else props += prop
								},
							)
						}
					}
					return [message, operation, props]
				}),
				switchMap(([message, operationId, properties]) => {
					return this.translate.get(message, { operationId, properties })
				}),
				takeUntil(this.destroy$),
			)
			.subscribe((message) => {
				this._message.message = message
			})
	}

	public toggle(): void {
		this._show = !this._show
	}

	public clear(): void {
		const valid = this.validate(this.value)
		this.value = null
		if (valid) this.search.emit([this._param, null])
	}

	public emit(): void {
		this.value$.next(this.value)
	}

	private validate(input: string): boolean {
		if (!input || !input.length) {
			this.response.set(this.seed, this._message)
			return false
		}

		if (this.noop) return true

		const model = new ResponseModel()
		model.type = 'error' as any

		if (this._pattern) {
			const cleaned = String(input).trim()
			const match = this._pattern.test(cleaned)
			if (!match) {
				model.message = 'common.validation.pattern'
				this.response.set(this.seed, model)
				return false
			}
		}

		for (const key in this._schema) {
			let error
			switch (key) {
				case 'minLength':
					error = input.length < this._schema[key]
					break
				case 'maxLength':
					error = input.length > this._schema[key]
					break
				default:
					break
			}

			if (error) {
				model.message = `common.validation.${key}`
				model.params = { [key]: this._schema[key] }
				this.response.set(this.seed, model)
				return false
			}
		}

		this.response.set(this.seed, this._message)
		return true
	}

	private cleanRegex(rx: string | string[]): void {
		if (!rx) return
		if (Array.isArray(rx)) return

		this._pattern = new RegExp(rx)
	}

	private setResponseModel(): void {
		if (!this._schema) return
		const fields = this.openapi.getCustomParamField(this._schema)
		if (!fields) return

		const model = new ResponseModel()
		model.type = 'default' as any

		this._message = model
		this.response.set(this.seed, this._message)

		if ('properties' in fields) {
			let translated: string[] = []

			if (Array.isArray(fields.properties)) {
				translated = fields.properties.map((prop) => {
					if (fields.schema) return `schema.${fields.schema}.${prop}`
					else return `common.${prop}`
				})
			} else {
				if (fields.schema) translated = [`schema.${fields.schema}.${fields.properties}`]
				else translated = [`common.${fields.properties}`]
			}

			this.properties$.next(translated)
		}

		const tlstring = ['response', 'default', 'search']
		this._wildcard = 'wildcard' in fields

		if (this._wildcard) {
			tlstring.push('wildcard')
		}

		this.message$.next(tlstring.join('.'))
	}

	@HostBinding('style.display.none')
	get invisible(): boolean {
		return !this._param?.name && !this.noop
	}
}
