import { set } from 'lodash-es'

import {
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnInit,
	Output,
	Renderer2,
} from '@angular/core'
import { FormGroup } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { FormlyFormOptions } from '@ngx-formly/core'
import { NgqFieldConfig } from '@quebble/formly'
import { TranslationTypes } from '@quebble/models'
import { OpenApi } from '@quebble/openapi'
import { hasValue } from '@quebble/scripts'
import { TransLinkService, TransnamicService } from '@quebble/services'
import { BehaviorSubject, Subject } from 'rxjs'
import { filter, takeUntil } from 'rxjs/operators'

import { Translation, TranslationArrayItem } from '../../models/translation.model'

@Component({
	selector: 'ngq-translations',
	template: `
		<div class="translations-list" [loader]="hasObject === null">
			<ng-container [response]="operation.id" *ngIf="operation.id"></ng-container>

			<ng-container *ngIf="hasObject === false">
				<ngq-card mode="light" type="card" [title]="'Vertalingen'" class="list-0">
					<ngq-avatar-row
						[items]="avatarRow"
						[fallback]="'language'"
						[gender]="null"
						(select)="selectItem($event)"
						subject="subject"
						size="4"
						iconsize="1.5"
					></ngq-avatar-row>
				</ngq-card>
			</ng-container>

			<ng-container *ngIf="hasObject === true">
				<ngq-card
					[title]="'enum.translationType.' + object.type | translink"
					mode="light"
					*ngIf="object && object.type"
				>
					<div class="translations-form">
						<form [formGroup]="form">
							<formly-form
								[model]="object"
								[fields]="object.formFields"
								[options]="options"
								[form]="form"
							></formly-form>
							<span class="button-wrapper">
								<ngq-button
									mode="large"
									type="submit"
									class="btn btn-primary submit-button"
									(click)="submitForm(object)"
								>
									Submit
								</ngq-button>
							</span>
						</form>
					</div>
				</ngq-card>
			</ng-container>
		</div>
	`,
	styleUrls: ['./ngq-translations.component.scss'],
	providers: [TransnamicService],
})
export class NgqTranslationsComponent implements OnInit {
	@Input()
	set array(list: any | any[]) {
		this._array = hasValue(list) ? (Array.isArray(list) ? list : [list]) : []
	}
	get array(): any | any[] {
		return this._array
	}
	@Input()
	set object(item: any) {
		this._tltype = null
		this.object$.next(item)
	}
	get object(): any {
		return this._object
	}
	@Input() set chunk(chunk: OpenApi.Chunk) {
		this._chunk = chunk
		if (chunk) {
			const object: OpenApi.Chunk = chunk.viewchunks.get('object')
			const array: OpenApi.Chunk = chunk.viewchunks.get('array')

			const operation = object
				? object.operation
				: array.linkops.find((op) => op.type === 'get')

			this.operation = operation
			this.hasObject = !!object
		} else {
			this.operation = new OpenApi.Operation()
			this.hasObject = null
		}
	}

	@Output() public action: EventEmitter<any> = new EventEmitter()

	public hasObject: boolean = null

	public operation: OpenApi.Operation

	public form = new FormGroup({})
	public formFields: NgqFieldConfig[] = this.transnamic.formFields()
	public newfields: NgqFieldConfig[] = []
	public newobj: any = {}

	public options: FormlyFormOptions = {}
	public translationTypes = TranslationTypes.map((item, index) => index).filter(
		(item) => item > 0,
	)

	public avatarRow: any[] = TranslationTypes.map((item, index) => {
		return {
			id: index,
			subject: `enum.translationType.${index}`,
		}
	}).filter((a, idx) => idx > 0)

	private _array: any | any[]
	private _object: any
	private _chunk: OpenApi.Chunk
	private _tltype: string

	private object$: BehaviorSubject<any> = new BehaviorSubject(null)
	private destroy$: Subject<void> = new Subject()

	constructor(
		private openapi: OpenApi.OpenApiService,
		private transnamic: TransnamicService,
		private translate: TransLinkService,
		private elRef: ElementRef,
		private render: Renderer2,
		private active: ActivatedRoute,
	) {
		this.__componentClass()
	}

	public ngOnInit(): void {
		this.primeSubscriptions()
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
	}

	public selectItem(item: any): void {
		// this.openapi.chunkNavigation(
		// 	this.active,
		// 	this._chunk,
		// 	this.operation,
		// 	item?.id ?? item,
		// 	false,
		// 	'type',
		// )
	}

	public icon(method: OpenApi.OperationType): [string, string] {
		switch (method) {
			case 'patch':
			case 'put':
				return ['pencil', 'dark']
			case 'delete':
				return ['trash-o', 'error']
			default:
				return [null, null]
		}
	}

	private primeSubscriptions(): void {
		this.object$
			.pipe(
				filter((item) => {
					if (!item && this._object) this._object = null

					if (!this.hasObject) return false
					if (item === null) return false

					if (item === undefined) {
						this.noObjectResult()
						return false
					}

					return true
				}),
				takeUntil(this.destroy$),
			)
			.subscribe((item) => {
				const compare = this.transnamic.translationTypeCompare(item)
				const transformed = this.transformTranslation(compare) as Translation
				this._object = transformed
				this.newobj = transformed.translation ?? transformed.origin
			})
	}

	private noObjectResult(): void {
		this._object = null

		if (!this._chunk?.viewchunks?.has('object')) return

		const hasobj = this._chunk.viewchunks.get('object')
		if (hasobj) {
			const type = hasobj.values.get('{type}')
			const provider_id = hasobj.values.get('{provider_id}')
			if (!type || !provider_id) return

			const item = {
				id: null,
				type,
				provider_id,
				translation: {},
				origin: {},
			}

			const key = TranslationTypes[type]
			this._tltype = key

			const compared = this.transnamic.translationTypeCompare(item as any)
			compared.origin = this.translate.origin(key)

			const parsed = this.transformTranslation(compared)
			this._object = parsed
		}
	}

	private transformTranslation(element: Translation): Translation {
		if (!element) return

		const key = TranslationTypes[element.type]
		this._tltype = key

		element.translationArray = this.objectToArray(element.translation[key], element.origin)
		element.formFields = this.formFields
		element.key = key

		return element
	}

	/**
	 * Prepare semantics translation structure for submit
	 * @param array translation array items
	 */
	private combineSemantics(array: TranslationArrayItem[]): Record<string, any> {
		if (!hasValue(array)) return

		const semantic: any = {}

		array.forEach((item) => {
			if (item.semantic) {
				set(semantic, item.keypath, item.semantic)
			}
		})

		return semantic
	}

	public submitForm(item: Translation): void {
		if (!this.form.value.translationArray) return

		const { key, translationArray } = item

		const values = this.transArrayToObject(translationArray)
		const cleaned = this.transnamic.cleanTranslation(values)

		const translation = {}
		translation[key] = cleaned

		const payload: any = {}
		payload.translation = translation
		payload.semantic = this.combineSemantics(item.translationArray)
		payload.type = item.type

		let operation
		const object = this._chunk?.viewchunks?.get('object')
		const array = this._chunk?.viewchunks?.get('array')

		payload.provider_id = object
			? object.values.get('{provider_id}')
			: array.values.get('{provider_id}')

		if (object && this.object && this.object.id) {
			operation = object.operations.find((op) => op.type === 'patch')
		} else {
			operation = array.operations.find((op) => op.type === 'post')
		}

		if (!operation) {
			console.error('Operation is missing to submit the translations')
			return
		}

		this.openapi.operationActionByModel(operation, payload).subscribe(() => {
			console.info('%ctranslation is saved 🙌', 'color: green')
		})
	}

	private objectToArray(
		obj: Record<string, any>,
		origin: Record<string, any>,
		keypath?: string,
		map?: Map<string, any>,
	): TranslationArrayItem[] {
		if (Object.keys(obj).length === 0) return []
		let arr: TranslationArrayItem[] = []
		const originData = map ?? new Map(Object.entries(origin))

		for (const [key, value] of Object.entries(obj)) {
			const path = keypath ? `${keypath}.${key}` : key

			const item = new TranslationArrayItem()
			item.key = key
			item.value = value
			item.path = keypath
			item.originValue = originData.get(key)
			item.tltype = this._tltype
			if (item.semantics) {
				item.semantic = this.translate.instant(item.value)
				item.originSemantic = { ...item.semantic }
			}

			if (Array.isArray(value)) {
				item.type = 'enum'
				arr.push(item)
				arr = arr.concat(this.objectToArray(value, origin, path, originData))
			} else if (value !== null && typeof value === 'object') {
				item.type = 'object'
				// item.value = null
				// item.originValue = ''
				arr.push(item)

				const mapobj = originData.get(key)
				const entries = mapobj ? Object.entries(mapobj) : null
				const map = new Map(entries)

				arr = arr.concat(this.objectToArray(value, mapobj, path, map))
			} else {
				item.type = 'input'
				arr.push(item)
			}
		}

		return arr
	}

	private transArrayToObject(values: TranslationArrayItem[]): { [key: string]: string } {
		const obj = {}
		values.forEach((item) => {
			const joined = item.path ? `${item.path}.${item.key}` : item.key
			if (item.type === 'object') set(obj, joined, {})
			else set(obj, joined, item.value)
		})

		return obj
	}

	private __componentClass(): void {
		const el = this.elRef.nativeElement
		this.render.addClass(el, 'ngq-component')
		this.render.addClass(el, 'ngq_translations')
	}
}
