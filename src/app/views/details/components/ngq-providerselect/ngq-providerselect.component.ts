import { Component, Input } from '@angular/core'
import { OpenApi } from '@quebble/openapi'

@Component({
	selector: 'ngq-providerselect',
	template: `
		<!--!issame ? ('system.selectprovider.__title' | translink) : null-->

		<div
			class="provider_select-frame"
			[class.provider_select-switch]="!issame && current?.id !== null"
			[class.provider_select-active]="issame"
			[class.provider_select-select]="!current"
		>
			<ng-template [ngIf]="!!current">
				<ng-template [ngIf]="!issame && current?.id !== null" [ngIfElse]="isCurrent">
					<div class="provider_select-text">
						{{
							'system.selectprovider.current'
								| translink
									: { organisation: current?.name, secondary: provider?.name }
						}}
					</div>
					<div class="provider_select-button">
						<ngq-button
							icon="random"
							[color]="['info-alt', 'primary-alt']"
							(click)="select()"
						>
							{{ 'system.selectprovider.switch' | translink }}
						</ngq-button>
					</div>
				</ng-template>

				<ng-template #isCurrent>
					<div class="provider_select-text">
						{{
							'system.selectprovider.same'
								| translink: { organisation: current?.name }
						}}
					</div>
					<div class="provider_select-button">
						<ngq-button
							icon="power-off"
							[color]="['error-alt', 'primary-alt']"
							(click)="deselect()"
						>
							{{ 'system.selectprovider.clear' | translink }}
						</ngq-button>
					</div>
				</ng-template>
			</ng-template>

			<ng-template [ngIf]="!current">
				<div class="provider_select-text">
					{{
						'system.selectprovider.clean' | translink: { organisation: provider?.name }
					}}
				</div>

				<div class="provider_select-button">
					<ngq-button
						icon="check-circle-o"
						[color]="['success-alt', 'primary-alt']"
						(click)="select()"
					>
						{{ 'system.selectprovider.setup' | translink }}
					</ngq-button>
				</div>
			</ng-template>
		</div>
	`,
	styleUrls: ['./ngq-providerselect.component.scss'],
})
export class NgqProviderselectComponent {
	@Input() public provider: any
	constructor(private openapi: OpenApi.OpenApiService) {}

	get issame(): boolean {
		if (!this.provider?.id) return false
		if (!this.current?.id) return false
		if (this.provider?.id === this.current?.id) return true
		if ('header_' + this.current?.id === this.provider?.id) return true
	}

	get current() {
		return this.openapi.workspace
	}

	public select(): void {
		const { name, id } = this.provider
		const copy = {
			name,
			id,
		}
		copy.id = copy.id.replace('header_', '')
		this.openapi.workspace = copy
	}

	public deselect(): void {
		this.openapi.workspace = null
	}
}
