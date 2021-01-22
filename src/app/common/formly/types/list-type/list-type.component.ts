import { Component } from '@angular/core'
import { FadeInOutAnimation } from '@quebble/animations'
import { StorageKeys } from '@quebble/consts'
import { OpenApi } from '@quebble/openapi'
import { asArray, hasValue } from '@quebble/scripts'
import { StorageService, TransLinkService } from '@quebble/services'
import { Subject } from 'rxjs'

import { SearchFieldClass } from '../../classes/search-field.class'

@Component({
	selector: 'formly-list-item',
	animations: FadeInOutAnimation,
	template: `
		<div class="item_type-list">
			<div class="item_type-titlebar">
				<ng-template [ngIf]="label">
					<ng-template [ngIf]="devmode">
						<label
							matTooltip="::DEV:: Log ListTypeComponent to console"
							(click)="__log()"
						>
							{{ label | translink }}
						</label>
					</ng-template>

					<ng-template [ngIf]="!devmode">
						<label>
							{{ label | translink }}
						</label>
					</ng-template>
				</ng-template>

				<div class="ngq-label-line"></div>

				<ng-template [ngIf]="!!field.formControl">
					<ngq-button
						[icon]="['save', 'check']"
						[color]="['info-alt', 'success-alt']"
						[disabled]="!valid"
						(click)="save()"
					></ngq-button>

					<ngq-button
						[icon]="['undo']"
						[color]="['warning-alt']"
						[disabled]="!resetable"
						*ngIf="resetable"
						(click)="reset()"
						[@fadeInOut]
					></ngq-button>

					<ngq-button
						[icon]="['trash']"
						[color]="['error-alt']"
						[disabled]="!deletable"
						(click)="delete()"
						*ngIf="deletable"
						[@fadeInOut]
					></ngq-button>

					<ngq-button
						[icon]="['times']"
						[color]="['accent-alt']"
						(click)="cancel()"
					></ngq-button>
				</ng-template>
			</div>

			<div class="item_type-list-comp">
				<ngq-description *ngIf="to.description">{{ to.description }}</ngq-description>
				<ngq-list
					[operation]="operation"
					[array]="datastream$ | async"
					[selected]="selected"
					[deselect]="clear$ | async"
					[show-header]="false"
					[show-sorting]="!!operation?.id"
					[show-search]="!!operation?.id"
					[show-edit]="false"
					[show-filter]="false"
					[show-ops]="false"
					[show-avatar]="true"
					[output-event]="true"
					[full-select]="true"
					[multiple-select]="to.multiple"
					[expand-select]="false"
					[focus-search]="false"
					[view-small]="ngq.viewkeys"
					(select)="select($event)"
					(search)="search($event)"
					class="list-embedded"
				></ngq-list>
			</div>
		</div>
	`,
	styleUrls: ['../item-type.component.scss'],
})
export class ListTypeComponent extends SearchFieldClass {
	public operation: OpenApi.Operation
	public selected: any | any[] = []

	public clear$: Subject<boolean> = new Subject()

	private _instance: any

	constructor(
		private storage: StorageService,
		protected openapi: OpenApi.OpenApiService,
		protected translate: TransLinkService,
	) {
		super(openapi, translate)
	}

	get valid(): boolean {
		return (
			((this.formControl.valid && !this.formControl.pristine) ||
				(!this.formControl.invalid && this.formControl.disabled)) &&
			this.resetable
		)
	}

	get resetable(): boolean {
		return this.to.multiple
			? asArray(this._values).length !== asArray(this.selected).length
			: hasValue(this._values) || (!hasValue(this._values) && hasValue(this.selected))
	}

	get deletable(): boolean {
		return hasValue(this.selected)
	}

	public ngOnInit(): void {
		super.ngOnInit(true)

		this.search(null)
	}

	/**
	 * @todo
	 * Currently, selected is always filled with the current values. It'd be a
	 * better idea to filter the datastream in the parent class and check if
	 * there's data and if the data given includes the item?
	 */
	public ngAfterContentInit(): void {
		super.ngAfterContentInit()
		this.selected = this._values

		this._instance = this.ngq.component
	}

	private close(): void {
		this.storage.cache.set(StorageKeys.Form.Field, this.getNestedField(this.field, 'close'))
	}

	/**
	 * Patch the selected value to the formControl, thus 'saving' the selected
	 * value. Closes the field.
	 */
	public save(): void {
		if (!this.valid) return

		this.formControl.markAsPristine()
		this.formControl.markAsUntouched()

		if (hasValue(this.selected)) {
			this.parseValue(this.selected, this.formControl, 'setValue')
			this.formControl.updateValueAndValidity()
		}

		this.close()
	}

	public cancel(): void {
		this.reset()
		this.close()
	}

	/**
	 * Reset, but also re-apply the original values to the currently selected
	 * item.
	 */
	public reset(): void {
		this.resetModel()
		this.selected = this._values
		if (!hasValue(this.selected)) this.clear$.next(true)
	}

	public delete(): void {
		this.selected = this.to.multiple ? [] : undefined

		this.formControl.reset()
		this.formControl.markAsTouched()
		this.formControl.markAsDirty()
		this.clear$.next(true)
	}

	public select(items: any | any[]): void {
		if (!hasValue(items)) return

		if (this.to.multiple) {
			this.selected = asArray(items).filter((a) => hasValue(a))
		} else {
			this.selected = asArray(items)[0] ?? null
		}

		if ((hasValue(this._values) && !hasValue(this.selected)) || hasValue(this.selected)) {
			this.formControl.markAsDirty()
			this.formControl.markAsTouched()

			this.clear$.next(false)
		}
	}

	public search(value?: [any, OpenApi.ParameterObject, string]): void {
		const input = value ? value[2] : null
		this.datastream$ = this.getData(input)
	}
}
