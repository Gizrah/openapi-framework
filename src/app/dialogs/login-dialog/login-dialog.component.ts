import { Component, HostBinding, Inject, OnInit } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { DialogData } from '@quebble/interfaces'
import { OpenApi } from '@quebble/openapi'

@Component({
	selector: 'ngq-login-dialog',
	template: `
		<div mat-dialog-content>
			<h3>
				{{ 'system.login.__title' | translink }}
			</h3>
			<p>{{ 'system.login.__description' | translink }}</p>
		</div>

		<div mat-dialog-actions>
			<ngq-button icon="times" color="dark" mode="mini" (click)="close()">
				{{ 'generic.cancel' | translink }}
			</ngq-button>

			<ngq-button
				[icon]="['lock', 'share']"
				[color]="['primary-alt', 'accent-alt', 'info-alt']"
				position="bottom-right"
				(click)="login()"
			>
				{{ 'system.login.login' | translink }}
			</ngq-button>
		</div>
	`,
	styleUrls: ['./login-dialog.component.scss'],
})
export class NgqLoginDialogComponent implements OnInit {
	constructor(
		private openapi: OpenApi.OpenApiService,
		private dialog: MatDialogRef<NgqLoginDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: DialogData,
	) {}

	ngOnInit(): void {}

	public login(): void {
		const opts = this.data?.item ?? {}
		this.openapi.login(opts)
	}

	public close(): void {
		this.dialog.close()
	}

	@HostBinding('class.ngq_dialog-login')
	public __componentClass: boolean = true
}
