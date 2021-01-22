import { debounceTime, map, switchMap } from 'rxjs/operators'

import { Component, EventEmitter, Input, Output } from '@angular/core'
import { FormControl } from '@angular/forms'
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete'
import { OpenApi } from '@quebble/openapi'
import { asArray, hasValue } from '@quebble/scripts'
import { TransLinkService } from '@quebble/services'
import { of } from 'rxjs'

import { SearchFieldClass } from '../../classes/search-field.class'

interface LabelValue {
	label: string
	value: any
}

@Component({
	selector: 'formly-autocomplete',
	template: `
		<div class="item_type-auto">
			<ng-template [ngIf]="!inline">
				<ngq-description [title]="'generic.search' | translink">
					<div>
						{{ message$ | async }}
					</div>

					<ng-container *ngTemplateOutlet="autocompfield"></ng-container>
				</ngq-description>
			</ng-template>

			<ng-template [ngIf]="inline">
				<div class="item_type-auto-inline">
					<ng-container *ngTemplateOutlet="autocompfield"></ng-container>
				</div>
			</ng-template>
		</div>

		<ng-template #autocompfield>
			<div class="item_type-search" [matTooltip]="!inline ? null : (message$ | async)">
				<mat-form-field appearance="outline">
					<input
						type="text"
						matInput
						[formControl]="autocomplete"
						[matAutocomplete]="auto"
						class="item_type-search-input"
					/>

					<mat-autocomplete
						#auto="matAutocomplete"
						(optionSelected)="selectItem($event)"
						class="ripple-color"
					>
						<mat-option
							*ngFor="let option of datastream$ | async"
							[value]="option.value"
						>
							{{ option.label }}
						</mat-option>
					</mat-autocomplete>
					<div class="item_type-search-actions">
						<ngq-button
							[icon]="'search'"
							[inactive]="!formval"
							mode="mini"
							color="grey-alt"
							class="item_type-search-action"
							(click)="autocomplete.updateValueAndValidity()"
						></ngq-button>
						<ngq-button
							[icon]="'times'"
							[loading]="operation?.id"
							[inactive]="!formval"
							mode="mini"
							color="grey-alt"
							class="item_type-search-action"
							(click)="clear()"
							*ngIf="!!formval"
						></ngq-button>
					</div>
				</mat-form-field>

				<i
					class="item_type-search-empty fa fa-warning"
					*ngIf="emptylist"
					[matTooltip]="'response.default.search.empty' | translink"
				></i>
			</div>
		</ng-template>
	`,
	styleUrls: ['../item-type.component.scss'],
})
export class AutocompleteTypeComponent extends SearchFieldClass {
	@Input() public inline: boolean = false
	@Input('subject') public customSubject: string
	@Input('value') public customValue: string
	@Input('noup') public noUpdate: boolean

	@Output() public search: EventEmitter<string> = new EventEmitter()
	@Output() public select: EventEmitter<any> = new EventEmitter()

	public autocomplete: FormControl = new FormControl()

	public listcount: number = 0

	constructor(openapi: OpenApi.OpenApiService, translate: TransLinkService) {
		super(openapi, translate)
	}

	get formval(): any {
		return this.autocomplete.value
	}

	get emptylist(): boolean {
		return (
			!this.autocomplete.pristine &&
			this.listcount === 0 &&
			this.autocomplete.value.length > 1
		)
	}

	public ngOnInit(): void {
		super.ngOnInit(true)

		this.primeSubscription()
	}

	public ngAfterContentInit(): void {
		super.ngAfterContentInit()
	}

	private primeSubscription(): void {
		this.datastream$ = this.autocomplete.valueChanges.pipe(
			debounceTime(50),
			switchMap((v) => {
				if (hasValue(v) && v.length > 1) {
					this.search.emit(v)

					return this.getData(v).pipe(
						map((results) => {
							const items = asArray(results).map((item, idx) => {
								return {
									value: item.id ?? this.customValue ?? idx,
									label: item[this.operation?.subject ?? this.customSubject],
								}
							})
							// Set the local listcount var
							this.listcount = items.length
							return items
						}),
					)
				} else return of([])
			}),
		)
	}

	/**
	 * Catch the selection event from MatAutocomplete and update the form to
	 * reflect this. The Formly model is also overwritten.
	 *
	 * @param event Autocomplete event
	 */
	public selectItem(event: MatAutocompleteSelectedEvent): void {
		const { option } = event ?? {}
		const item = this._data.find((i, idx) => (this.customValue ?? i.id ?? idx) === option.value)
		if (item) {
			this.autocomplete.patchValue(option.getLabel(), { emitEvent: false })
			if (!this.noUpdate) {
				this.formControl.enable()

				this.overwriteModel(item)
				this.parseValue(item, this.formControl)

				for (const key in item) {
					const fc = this.formControl.get(key)
					if (fc) fc.disable()
				}

				this.formControl.markAsDirty()
				this.formControl.markAsTouched()
			} else {
				this.select.emit(item)
				this.autocomplete.patchValue(option.getLabel(), { emitEvent: false })
			}
		} else {
			// TODO: Handle this error not softly
			return
		}
	}

	public clear(): void {
		this.autocomplete.reset()
	}
}
