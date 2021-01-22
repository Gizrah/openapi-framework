import { FormlyModule } from '@ngx-formly/core'

import { AddressTypeComponent } from '../formly/types/address-type/address-type.component'
import { ArrayItemTypeComponent } from '../formly/types/array-item-type/array-item-type.component'
import { ArrayTypeComponent } from '../formly/types/array-type/array-type.component'
import { AutocompleteTypeComponent } from '../formly/types/autocomplete-type/autocomplete-type.component'
import { ListTypeComponent } from '../formly/types/list-type/list-type.component'
import { MultiSchemaTypeComponent } from '../formly/types/multischema-type.component'
import { NullTypeComponent } from '../formly/types/null-type.component'
import { ObjectOrSelectTypeComponent } from '../formly/types/object-or-select-type/object-or-select-type.component'
import { ObjectTypeComponent } from '../formly/types/object-type/object-type.component'
import { SelectTypeComponent } from '../formly/types/select-type/select-type.component'
import { NgqLabelTop } from '../formly/wrappers/label-top.wrapper'
import { AddressWrapperComponent } from '../formly/wrappers/nested/address/address.wrapper'
import { NgqNestedSingle } from '../formly/wrappers/nested/single/nested-single.wrapper'
import { ObjectOrSelectWrapperComponent } from '../formly/wrappers/object-or-select/object-or-select.wrapper'
import { NgqRowLabelInput } from '../formly/wrappers/row-label-input.wrapper'

export const FormlyFactory = FormlyModule.forRoot({
	wrappers: [
		{ name: 'row-label-input', component: NgqRowLabelInput },
		{ name: 'label-top', component: NgqLabelTop },
		{ name: 'object-or-select', component: ObjectOrSelectWrapperComponent },
		{ name: 'nested-single', component: NgqNestedSingle },
		{ name: 'address-wrapper', component: AddressWrapperComponent },
	],
	types: [
		{ name: 'string', extends: 'input', wrappers: ['row-label-input', 'form-field'] },
		{
			name: 'number',
			extends: 'input',
			defaultOptions: {
				templateOptions: {
					type: 'number',
				},
			},
			wrappers: ['row-label-input', 'form-field'],
		},
		{
			name: 'integer',
			extends: 'input',
			defaultOptions: {
				templateOptions: {
					type: 'number',
				},
			},
			wrappers: ['row-label-input', 'form-field'],
		},
		{ name: 'boolean', extends: 'checkbox', wrappers: ['row-label-input', 'form-field'] },
		{ name: 'enum', extends: 'select', wrappers: ['row-label-input', 'form-field'] },
		{ name: 'null', component: NullTypeComponent, wrappers: ['row-label-input', 'form-field'] },
		{ name: 'array', component: ArrayTypeComponent },
		{ name: 'object', component: ObjectTypeComponent },
		{ name: 'multischema', component: MultiSchemaTypeComponent },
		{ name: 'address', component: AddressTypeComponent },

		{ name: 'select-type', component: SelectTypeComponent },
		{ name: 'array-item', component: ArrayItemTypeComponent },
		{ name: 'object-select', component: ObjectOrSelectTypeComponent },
	],
	extras: {
		immutable: false,
	},
})

export const FormlyImports = [
	NgqRowLabelInput,
	ArrayTypeComponent,
	NullTypeComponent,
	MultiSchemaTypeComponent,
	SelectTypeComponent,
	AddressTypeComponent,
	NgqLabelTop,
	ObjectOrSelectWrapperComponent,
	NgqNestedSingle,
	ArrayItemTypeComponent,
	ObjectOrSelectTypeComponent,
	AutocompleteTypeComponent,
	ListTypeComponent,
	AddressWrapperComponent,
	ObjectTypeComponent,
]
