import { Injectable } from '@angular/core'
import { FormControl, Validators } from '@angular/forms'
import { isNaB } from '@quebble/scripts'
import { TransLinkService } from '@quebble/services'

import { NgqFieldConfig } from './formly.extend'

@Injectable({
	providedIn: 'root',
})
export class FormlyValidatorService {
	constructor(private translate: TransLinkService) {}

	get messages() {
		return {
			pattern: (err?, field?: NgqFieldConfig) => {
				return this.translate.instant('common.validation.pattern')
			},
			required: (err?, field?: NgqFieldConfig) => {
				return this.translate.instant('common.validation.required')
			},
			minLength: (err?, field?: NgqFieldConfig) => {
				return this.translate.instant('common.validation.minLength', {
					minLength: field.templateOptions.minLength,
				})
			},
			maxLength: (err?, field?: NgqFieldConfig) => {
				return this.translate.instant('common.validation.maxLength', {
					maxLength: field.templateOptions.maxLength,
				})
			},
			min: (err?, field?: NgqFieldConfig) => {
				return this.translate.instant('common.validation.min', {
					min: field.templateOptions.min,
				})
			},
			max: (err?, field?: NgqFieldConfig) => {
				return this.translate.instant('common.validation.max', {
					max: field.templateOptions.max,
				})
			},
			email: (err?, field?: NgqFieldConfig) => {
				return this.translate.instant('common.validation.email')
			},
		}
	}

	get validators() {
		return {
			email: (c: FormControl) => {
				const validator = Validators.email(c)
				return !validator
			},
			boolean: (c: FormControl) => {
				return !isNaB(c.value)
			},
		}
	}
}
