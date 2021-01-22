import { ChangeDetectorRef, Component } from '@angular/core'
import { FadeInOutAnimation } from '@quebble/animations'
import { StorageKeys } from '@quebble/consts'
import { List } from '@quebble/models'
import { asArray, hasValue, Methods } from '@quebble/scripts'
import { StorageService } from '@quebble/services'
import { ListItemStyle } from 'app/common/components/ngq-list/ngq-list-state.service'
import { Subject, Subscription } from 'rxjs'
import { debounceTime } from 'rxjs/operators'

import { NgqFieldArray, NgqFieldConfig } from '../../classes/formly.extend'

@Component({
	selector: 'formly-array-type',
	animations: FadeInOutAnimation,
	template: `
		<div class="item_type item_type-array" #arraytype>
			<div class="item_type-titlebar ngq-form-validity">
				<ng-template [ngIf]="label">
					<ng-template [ngIf]="devmode">
						<label
							class="accent"
							matTooltip="::DEV:: Log ArrayTypeComponent to console"
							(click)="__log()"
						>
							{{ label | translink }}
						</label>
					</ng-template>

					<ng-template [ngIf]="!devmode">
						<label class="accent">
							{{ label | translink }}
						</label>
					</ng-template>
				</ng-template>

				<div class="ngq-label-line"></div>

				<i class="ngq-form-active fa fa-chevron-right" *ngIf="!!active" [@fadeInOut]></i>

				<ngq-button
					[icon]="['list', 'plus']"
					[color]="['info-alt', 'primary-alt']"
					[disabled]="!!active"
					mode="mini"
					(click)="addItem()"
					*ngIf="!invalid && !active"
					[@fadeInOut]
				>
					{{ 'generic.add' | translink }}
				</ngq-button>

				<ngq-button
					[icon]="['list', 'exclamation']"
					[color]="['info-alt', 'error-alt', 'primary-alt']"
					[disabled]="!!active"
					mode="mini"
					(click)="addItem()"
					*ngIf="invalid && !active"
					[@fadeInOut]
				>
					{{ 'generic.edit' | translink }}
				</ngq-button>
			</div>

			<div class="item_type-array-originals" *ngIf="model?.length">
				<ngq-description [title]="null">
					<ngq-list
						[array]="model$ | async"
						[deselect]="!active"
						[show-header]="false"
						[show-ops]="false"
						[show-avatar]="false"
						[show-sorting]="false"
						[focus-search]="false"
						[show-search]="model?.length > 6"
						[index-select]="true"
						[view-small]="[[ngq.subject]]"
						[apply-style]="itemstyle"
						[style.height.px]="listheight"
						(select)="editItem($event)"
					></ngq-list>
				</ngq-description>
			</div>
		</div>
	`,
	styleUrls: ['../item-type.component.scss'],
})
export class ArrayTypeComponent extends NgqFieldArray {
	public editid: string = undefined
	public active: NgqFieldConfig

	public invalid: boolean = false
	public itemstyle: ListItemStyle = null
	public model$: Subject<any> = new Subject()

	private _created: List<any> = new List()
	private _fontsize: number = Methods.FontSize()
	private values$: Subscription

	constructor(private storage: StorageService, private cdRef: ChangeDetectorRef) {
		super()
	}

	get items(): any[] {
		return this.field?.fieldGroup ?? []
	}

	get listheight(): any {
		// Max amount of rows (6) or current length or 1
		const length = this.model?.length > 6 ? 6 : this.model.length ?? 1
		// If search bar is available, add its height
		const base = (this.model?.length > 6 ? 3.4 : 0) * this._fontsize
		// Multiply the rows times the fontsize * 2.5, add 2 pixels for the borders
		const rows = length * (this._fontsize * 2.5) + 2

		return base + rows
	}

	/**
	 * Call the super onInit, then set the local Subscription for the value
	 * changes. If the form is empty, the local Subject is filled with the
	 * current model's values. Otherwise, the values for each formControl are
	 * mapped to only their value and used to fill the local Subject.
	 *
	 * The local model$ Subject feeds the NgqListComponent with the right
	 * data. This isn't immediately updated in the model getter, so this is a
	 * workaround.
	 */
	public ngOnInit(): void {
		super.ngOnInit()

		this.values$ = this.formControl?.valueChanges.pipe(debounceTime(100)).subscribe((form) => {
			if (!hasValue(form)) this.model$.next(this.model)
			else {
				const values = this.formControl.controls.map((ctrl) => ctrl.value)
				this.model$.next(values)
			}
		})
	}

	/**
	 * Call the super afterContentInit and disable the formControl to prevent
	 * odd issues with validity of array items.
	 */
	public ngAfterContentInit(): void {
		super.ngAfterContentInit()
		this.formControl.disable()
	}

	/**
	 * Garbage content, unsubbed.
	 */
	public ngOnDestroy(): void {
		this.values$?.unsubscribe()
	}

	/**
	 * Method is called by the onDestroy of the ArrayItemComponent to make sure
	 * that clicking on a different form element 'completes' the item, but if
	 * the current active item isn't the same as the item as the closing field,
	 * that means that the user clicked another item in the array, so the active
	 * item doesn't need to be cleared.
	 *
	 * @param field NgqFieldConfig
	 */
	public checkItem(field: NgqFieldConfig): void {
		if (!field || !this.active) return
		if (field.id === this.active.id) this.completeItem(true)
	}

	/**
	 * Complete the currently opened field, either by storing or cancelling the
	 * action with the supplied state. The current formControl is fetched from
	 * the available ones.
	 *
	 * @param state true if field is supposed to be stored, false for closing
	 */
	public completeItem(state: boolean): void {
		if (!this.active) return

		// Get the current active item's formControl
		const fc = this.active.formControl

		if (fc) {
			// If the control exists, we'll check for the state. Do we want to
			// just close it, or do we want to store it?
			if (!state && fc.pristine) {
				// We're closing it and the fC is still pristine.
				// First, we check whether or not the original items for this
				// model has the current active id. If not, that means that the
				// user basically clicked Add and then immediately closed the
				// form (cancel or focussing another part of the form)
				if (!this._originals.has(this.active.id)) this.removeItem(this.active)
				// If it's part of the originals, but not part of the valids
				// -- e.g. changed then reset -- and the item is now valid, its
				// validated again.
				else if (!this.valids.has(this.active.id) && fc.valid && !fc.invalid)
					this.valids.add(this.active.id)
			} else {
				// Since its not cancelled and pristine, that means its either
				// valid or invalid.
				if (!fc.valid || fc.invalid) this.valids.delete(this.active.id)
				else if (fc.valid && !fc.invalid) this.valids.add(this.active.id)
			}
			// Validate all items based on the current changes
			this.validateItems()
		}

		// Clear the active item
		this.active = undefined
	}

	/**
	 * Add an item to the FormArray.
	 */
	public addItem(): void {
		// Clear the current active item, to make sure some checks in the
		// editItem function work properly
		this.active = undefined

		// The current length of the fieldGroup will be the index a new item
		// will be added to, so let's store it for later
		const index = this.field.fieldGroup.length

		// Create an empty field var
		let field
		// Before we add a new one, make sure that all items in the current
		// fieldGroup list are actually valid. If one's not, use that as the
		// item to edit instead. Uses Array.some to return a boolean value.
		const unfinished = this.field.fieldGroup?.some((item, index) => {
			if (!this.valids.has(item.id)) {
				field = item
				return true
			}
			return false
		})
		// If the Array.some is false, we can go ahead and add a new item via
		// the FormlyFieldArray super class function .add()
		if (!unfinished) this.add()

		// Get the newly added field if no invalid field is found
		if (!field) field = this.field.fieldGroup[index]

		// Use the field to start editing.
		this.editItem(field)
	}

	/**
	 * Remove an item from the FormArray and Formly FieldGroup.
	 *
	 * @param field field to remove
	 * @param close whether to close the field in the view
	 */
	public removeItem(field: NgqFieldConfig, close?: boolean): void {
		// The currently opened field will trigger the function with the close
		// property when pressing the 🗑 button, to make sure the field is
		// automatically closed when deleting it.
		if (close && field) {
			this.storage.cache.set(StorageKeys.Form.Field, this.getNestedField(field, 'close'))
		}

		// Remove the field from each of the related lists
		if (this.valids.has(field?.id)) this.valids.delete(field?.id)
		if (this._originals.has(field?.id)) this._originals.delete(field?.id)
		if (this._created.has(field?.id)) this._created.delete(field?.id)

		// Get the index of the field by parsing the field's key
		const key = parseInt(field?.key as string)
		const index = !isNaN(key) ? key : -1

		if (index > -1) {
			// If we have an index, remove it
			this.remove(index)
			// Trigger the update cycle in the Form ecosphere
			this.formControl.updateValueAndValidity()
			// Then disable the formControl
			this.formControl.disable()

			// Check if the amount of items in the current model equals the
			// size of the list with valid ids
			this.invalid = this.model.length !== this.valids.size
		}

		// Unset the current active item
		this.active = undefined

		// Detect the changes to prevent errors
		this.cdRef.detectChanges()
	}

	/**
	 * Edit an item with the supplied field or find the field based on the index
	 * when selecting from a list.
	 *
	 * @param f NgqFieldConfig | number
	 */
	public editItem(f: NgqFieldConfig | number): void {
		// If the item is a number, it's from the NgqListComponent's click
		// action. Use the number as index and get the field. Otherwise, assume
		// it's a field
		const field = typeof f !== 'number' ? f : this.field.fieldGroup[f]

		// Activate a field and compare it to the one that's going to be closed
		// or overwritten.
		const setActive = (field: NgqFieldConfig, close: NgqFieldConfig) => {
			if (!field) return
			// Make the nested object
			const nested = this.getNestedField(field)

			if (close && field.id === close.id) {
				// If the close id is the same as the field id, that means the
				// user clicked the same item. Close it and clear the field that
				// is now active.
				nested.type = 'close'
				this.active = undefined
			} else {
				// Otherwise, set the current active field and signal the root
				// wrapper to overwrite the original one.
				nested.type = 'array-item'
				this.active = field
			}

			// Signal the root wrapper with the nested object
			this.storage.cache.set(StorageKeys.Form.Field, nested)
		}

		// If the field is available, activate it instead of the current active
		// field (if available) or deactivate it if field matches active.
		if (field?.id) setActive(field, this.active)
		// If no field id is set, just clear the active field.
		else setActive(this.active, this.active)

		// Since the current active item is cleared, detect changes to prevent
		// all manner of errors
		this.cdRef.detectChanges()
	}

	/**
	 * Validate all currently known items in the fieldGroup and set the local
	 * itemstyle var that is sent to the NgqListComponent.
	 */
	private validateItems(): void {
		// Cast items as array to make sure it's an array
		const items = asArray(this.field.fieldGroup)

		// Preset the itemstyle
		const itemstyle: ListItemStyle = {
			style: {
				fontWeight: '500',
				color: 'rgb(238,0,0)',
				background: 'rgba(238,0,0,0.25)',
			},
			key: [],
		}

		// Loop through the items and if valids doesn't have the id, add the
		// index to the key array in the itemstyle object. The indices are used
		// by the NgqListComponent to determine positions in the list.
		items.forEach((item, idx) => {
			if (!this.valids.has(item.id)) itemstyle.key.push(idx)
		})

		// Update the item style and detect changes
		this.itemstyle = itemstyle
		this.cdRef.detectChanges()
	}
}
