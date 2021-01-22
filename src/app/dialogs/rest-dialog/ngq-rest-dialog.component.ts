import { debounceTime, filter, finalize, map, switchMap, takeUntil } from 'rxjs/operators'

import {
	ChangeDetectorRef,
	Component,
	ElementRef,
	HostBinding,
	Inject,
	Renderer2,
	ViewChild,
} from '@angular/core'
import { FormGroup } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { StorageKeys } from '@quebble/consts'
import { environment } from '@quebble/environment'
import { NgqFieldConfig } from '@quebble/formly'
import { DialogData } from '@quebble/interfaces'
import { OpenApi } from '@quebble/openapi'
import { hasValue, Methods } from '@quebble/scripts'
import { StorageService, TransLinkService } from '@quebble/services'
import { cloneDeep } from 'lodash-es'
import { BehaviorSubject, combineLatest, Subject } from 'rxjs'

@Component({
	selector: 'ngq-rest-dialog',
	template: `
		<div mat-dialog-title>
			<h3>
				{{ title }}
			</h3>
			<ngq-button mat-dialog-close icon="times" color="accent-alt"></ngq-button>
		</div>

		<ngq-rest-dialog-bar
			*ngIf="nested"
			[formId]="formId"
			(scrollto)="scrollTo($event)"
			[loader]="loader"
		></ngq-rest-dialog-bar>

		<div
			mat-dialog-content
			[ngSwitch]="__view"
			[class.mat-dialog-content-breadcrumbs]="nested"
			dialogFormIntersect
			[intersect]="formId"
			[intersect-width]="fullwidth"
			[intersect-update]="transupdate$"
			resize
			(res-height)="height($event)"
			#dialogContent
		>
			<ng-container *ngSwitchCase="null">
				<ng-container *ngTemplateOutlet="empty"></ng-container>
			</ng-container>

			<ng-container *ngSwitchCase="'form'">
				<ng-container *ngTemplateOutlet="form"></ng-container>
			</ng-container>

			<ng-container *ngSwitchCase="'delete'">
				<ng-container *ngTemplateOutlet="delete"></ng-container>
			</ng-container>
		</div>

		<ng-template #delete>
			<ng-template [ngIf]="subject">
				{{ 'common.delete.default' | translink: { subject: subject } }}
			</ng-template>
			<ng-template [ngIf]="!subject">
				{{ 'common.delete.unknown' | translink }}
			</ng-template>
		</ng-template>

		<ng-template #form>
			<ngq-form
				[(item)]="item"
				[operation]="operation"
				[loader]="loader"
				(field)="setField($event)"
				#ngqform
			></ngq-form>
		</ng-template>

		<ng-template #empty>Nothing</ng-template>

		<div mat-dialog-actions *ngIf="!!confirm && !!cancel" [response]="operation.id">
			<div class="ngq_dialog-required" *ngIf="required">
				<span class="required">*</span> {{ 'generic.required' | translink }}
			</div>

			<div class="ngq_dialog-basis"></div>

			<ngq-button [icon]="cancel[0]" color="dark" mode="mini" mat-dialog-close>
				{{ 'generic.' + cancel[1] | translink }}
			</ngq-button>

			<ng-template [ngIf]="devmode">
				<ngq-button
					color="accent-alt"
					(click)="__log()"
					class="__log__"
					matTooltip="::DEV:: IT'S A LOG. GET IT?"
				>
					<img src="/assets/img/log.png" />
				</ngq-button>
			</ng-template>

			<ngq-button
				[icon]="confirm[0]"
				[color]="confirm[1]"
				[loading]="operation.id"
				[disabled]="!valid"
				(click)="dialogAction()"
			>
				{{ 'generic.' + confirm[2] | translink }}</ngq-button
			>
		</div>

		<div class="ngq_dialog-noprogress" *ngIf="!action"></div>
		<mat-progress-bar mode="indeterminate" color="accent" *ngIf="action"></mat-progress-bar>
	`,
	styleUrls: ['./ngq-rest-dialog.component.scss'],
})
export class NgqRestDialogComponent {
	@ViewChild('dialogContent')
	private _dialogContent: ElementRef<HTMLElement>

	public __view: string = null

	public title: string
	public item: any
	public operation: OpenApi.Operation
	public confirm: [string, string, string]
	public cancel: [string, string]
	public action: boolean = false
	public formId: string
	public subject: string = undefined
	public required: boolean = false
	public loader: boolean = false
	public nested: boolean = false
	public firstfield: string

	public fullwidth: number
	public transupdate$: Subject<any> = new Subject()

	private _width: number = 0
	private _field: NgqFieldConfig
	private _fontsize: number = Methods.FontSize()
	private _sbsize: number = Methods.ScrollbarSize()

	private _scrollable: boolean = false
	private _nested: boolean = false

	private formId$: BehaviorSubject<string> = new BehaviorSubject(null)
	private destroy$: Subject<void> = new Subject()

	constructor(
		private openapi: OpenApi.OpenApiService,
		private render: Renderer2,
		private elRef: ElementRef,
		private translate: TransLinkService,
		private cdRef: ChangeDetectorRef,
		private storage: StorageService,
		private dialog: MatDialogRef<NgqRestDialogComponent>,
		@Inject(MAT_DIALOG_DATA)
		private data: DialogData,
	) {
		if (this.data) {
			this.operation = this.data.operation
			this.subject = this.data.subject
			if (!this.data.item) {
				this.item = this.openapi.operationPayload(this.operation?.id)
			} else {
				this.item = cloneDeep(this.data.item)
			}
		}

		this.dialogInit()
	}

	get valid(): boolean {
		return this.__view === 'delete' || (this._field?.formControl?.valid && !this._nested)
	}

	get post(): boolean {
		return this.operation.type === 'post'
	}

	public ngOnInit(): void {
		this.primeSubscriptions()
		this.setDialogWidth(false)
	}

	public ngAfterViewInit(): void {
		const el = this._dialogContent?.nativeElement
		if (!el) return
		const calc = window.getComputedStyle(el)
		const left = Methods.ParseSize(calc.paddingLeft)

		this._width = el.clientWidth - left[0] * 2
		this.fullwidth = el.clientWidth

		this.cdRef.detectChanges()
		this.storage.cache.set(StorageKeys.Dialog.Width, this._width)
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
		this.openapi.clearResponse(this.operation.id)
	}

	private primeSubscriptions(): void {
		this.primeTranslations()
		this.primeStorageKeys()
	}

	private primeTranslations(): void {
		const items = [
			'operation.operationId.' + this.operation?.id,
			'operation.operationType.' + this.operation?.type,
		]
		this.translate
			.get(items)
			.pipe(
				switchMap((result) => {
					let key = 'common.dialog.'
					const values = {
						operationId: result[items[0]],
						operationType: result[items[1]],
						subject: this.subject,
					}

					switch (this.operation.type) {
						case 'post':
							key = key + (this.subject ? 'postto' : 'post')
							break
						default:
							key = key + this.operation.type
							break
					}

					return this.translate.get(key, values)
				}),
			)
			.subscribe((result) => {
				this.title = result
			})
	}

	private primeStorageKeys(): void {
		this.storage.cache
			.get(StorageKeys.Form.Fields)
			.pipe(
				filter((fields) => !!fields && hasValue(fields[this.formId])),
				map((fields) => fields[this.formId]?.length ?? 1),
			)
			.subscribe((length: number) => {
				if (length > 2) this.scrollTo(length)
			})

		const combined = this.storage.cache.join([
			StorageKeys.Dialog.Height,
			StorageKeys.Form.Height,
			StorageKeys.Dialog.Nested,
		])
		combineLatest(combined)
			.pipe(
				debounceTime(50),
				map(([d, f, n]: [number, number, boolean]) => {
					const changed = hasValue(n) && n !== this._nested
					if (changed) this.setDialogWidth(n)
					return [d, f, changed]
				}),
				filter(([d, f]) => hasValue(d) && hasValue(f)),
				map((tuple: [number, number, boolean]) => {
					if (hasValue(tuple[1])) {
						const margins = 2 * this._fontsize
						const form = tuple[1] ?? 0
						tuple[1] = form + margins
					}
					return tuple
				}),
				takeUntil(this.destroy$),
			)
			.subscribe(([diag, form, changed]: [number, number, boolean]) => {
				const el = this.elRef.nativeElement

				if (form > diag) {
					if (this._scrollable && !changed) return
					const current = this._nested ? this.fullwidth * 2 : this.fullwidth

					this._scrollable = true
					this.render.setStyle(el, 'width', `${current + this._sbsize}px`)
				} else {
					this._scrollable = false
					this.render.removeStyle(el, 'width')
				}
			})
	}

	private dialogInit(): void {
		this.loader = true
		if (this.data) {
			if (!this.data.operation) return
			const method = this.data.operation.type
			switch (method) {
				case 'delete':
					this.__view = 'delete'
					this.confirm = ['trash-o', 'error', 'delete']
					this.cancel = ['ban', 'cancel']
					break
				case 'post':
					this.__view = 'form'
					this.confirm = ['save', 'primary', 'save']
					this.cancel = ['times', 'close']
					break
				case 'put':
				case 'patch':
					this.__view = 'form'
					this.confirm = ['save', 'primary', 'save']
					this.cancel = ['ban', 'cancel']
					break
				default:
					this.__view = null
					break
			}

			if (this.__view === 'form') {
				const schema = this.openapi.getSchema(this.data.operation.schema)
				if (schema && schema.properties) {
					for (const key in schema.properties) {
						if (schema.properties[key].required) {
							this.required = true
							break
						}
					}
				}
			} else {
				this.loader = false
			}

			this.subject = this.data.subject
		}
	}

	private setDialogWidth(state: boolean): void {
		const comp = this.elRef.nativeElement as HTMLElement
		const css = 'ngq_dialog-rest-double'

		this._nested = state

		if (state) {
			if (!comp.classList.contains(css)) this.render.addClass(comp, css)
		} else {
			this.render.removeClass(comp, css)
		}
	}

	public setField(field: NgqFieldConfig): void {
		this._field = field
		this.formId$.next(field.ngqOptions.formId)

		this.firstfield =
			field.templateOptions.label ?? field.ngqOptions.label ?? field.ngqOptions.tlstring

		setTimeout(() => {
			this.formId = field.ngqOptions.formId

			this.setKnownFields()

			this.nested = field.fieldGroup.some(
				(field) =>
					field.className &&
					(field.className.includes('--object') || field.className.includes('--array')),
			)
			this.loader = false
		})
	}

	public height(height: number): void {
		this.storage.cache.set(StorageKeys.Dialog.Height, height)
	}

	public dialogAction(): void {
		if (!this.operation) return
		if (!this.valid) return
		this.action = true

		this.openapi
			.chunkOperation(this.data.chunk, this.operation.type, cloneDeep(this.item))
			.pipe(
				finalize(() => {
					this.action = false
				}),
			)
			.subscribe(() => {
				this.dialog.close(this.item)
			})
	}

	private setKnownFields(): void {
		if (!this.data.chunk?.values) return
		this.data.chunk.values.forEach((value, key) => {
			if (key.includes('{')) return
			const group = this._field.formControl as FormGroup
			if (group.contains(key)) group.patchValue({ [key]: value })
			const field = this._field.fieldGroup.find((field) => field.key === key)
			if (field) field.hide = true
		})
	}

	public scrollTo(panel: number): void {
		const min = panel - 2 > -1 ? panel - 2 : 0
		const sum = min * this.fullwidth + this._width

		const diag = this._dialogContent?.nativeElement ?? null
		if (diag) {
			if (diag.scrollLeft < sum) {
				setTimeout(() => {
					diag.scrollBy({ left: sum, behavior: 'smooth' })
				}, 150)
			}
		}
	}

	@HostBinding('class.ngq_dialog-rest')
	public __componentClass: boolean = true

	// ::DEV::
	get devmode(): boolean {
		return environment.dev || !environment.production
	}

	public __log(): void {
		console.group('LOGGING CURRENT FORM')
		console.log('DATA', this.data)
		console.log('FORMCONTROL', this._field?.formControl as FormGroup)
		console.log('FORMLY FIELD CONFIG', this._field)
		console.groupEnd()
	}
}
