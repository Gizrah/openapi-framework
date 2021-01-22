import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { RouterTestingModule } from '@angular/router/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { AppComponent } from './app.component'
import { HttpLoaderFactory } from './common/factories/ngx-translate.factory'
import { OpenApiFactory } from './common/factories/openapi.factory'
import { WebServiceConfigProvider, WebServiceProvider } from './common/factories/webservice.factory'
import { StorageService } from './common/services/storage/storage.service'

describe('AppComponent', () => {
	let component: AppComponent
	let fixture: ComponentFixture<AppComponent>

	beforeEach(() => {
		TestBed.configureTestingModule({
			schemas: [NO_ERRORS_SCHEMA],
			declarations: [AppComponent],
			imports: [
				MatSnackBarModule,
				RouterTestingModule,
				HttpClientTestingModule,
				TranslateModule.forRoot({
					loader: {
						provide: TranslateLoader,
						useFactory: HttpLoaderFactory,
						deps: [HttpClient],
					},
				}),
			],
			providers: [
				StorageService,
				WebServiceConfigProvider,
				WebServiceProvider,
				...OpenApiFactory,
				TranslateModule,
			],
		})
		fixture = TestBed.createComponent(AppComponent)
		component = fixture.componentInstance
	})

	it('can load instance', () => {
		expect(component).toBeTruthy()
	})
})
