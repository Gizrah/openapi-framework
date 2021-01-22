/**
 * Angular
 */
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'
import {
	APP_INITIALIZER,
	CUSTOM_ELEMENTS_SCHEMA,
	ErrorHandler,
	NgModule,
	Injector,
} from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'

/**
 * External dependencies
 */
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { MatRippleModule, MatNativeDateModule } from '@angular/material/core'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatDialogModule } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatTableModule } from '@angular/material/table'
import { MatMenuModule } from '@angular/material/menu'
import { MatRadioModule } from '@angular/material/radio'
import { MatSelectModule } from '@angular/material/select'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatButtonModule } from '@angular/material/button'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { ScrollingModule } from '@angular/cdk/scrolling'
import { MatAutocompleteModule } from '@angular/material/autocomplete'

/**
 * Formly
 */
import { FormlyMaterialModule } from '@ngx-formly/material'
import { FormlyMatDatepickerModule } from '@ngx-formly/material/datepicker'
import { FormlyMatToggleModule } from '@ngx-formly/material/toggle'
import { FormlyImports } from './common/factories/formly.factory'
import { FormlyValidatorService } from './common/formly/classes/formly.validator'

/**
 * Custom Modules
 */
import { AppRoutingModule } from './app-routing.module'

/**
 * Factories
 */

import { AppInitializerFactory } from './common/factories/appinitializer.factory'
import { HttpLoaderFactory } from './common/factories/ngx-translate.factory'
import { provideErrorHandler } from './common/factories/sentry.factory'
import { OpenApiFactory } from './common/factories/openapi.factory'
import { WebServiceConfigProvider, WebServiceProvider } from './common/factories/webservice.factory'
import { FormlyFactory } from './common/factories/formly.factory'

/**
 * Services
 */
import { InterceptorService } from './common/services/interceptor/service/interceptor.service'
import { StorageService } from './common/services/storage/storage.service'
import { WebCancelService } from './common/services/web-cancel/web-cancel.service'
import { WebService } from './common/services/web/web.service'
import { RouterParamsService } from './common/services/routerparams/routerparams.service'
import { LoadingService } from './common/services/loading/service/loading.service'
import { ResponseService } from './common/services/response/service/response.service'
import { TransLinkService } from './common/services/translation/service/translink.service'
import { NgqBarService } from './common/components/ngq-bar/ngq-bar.service'

/**
 * Directives
 */
import { LoadingDirective } from './common/services/loading/directive/loading.directive'
import { ResponseDirective } from './common/services/response/directive/response.directive'
import { DialogFormIntersectionDirective } from './common/directives/dialog-form-intersection.directive'
import { MasonryDirective } from './common/directives/masonry.directive'
import { ResizeDirective } from './common/directives/resize.directive'
import { TextareaTabDirective } from './common/directives/textarea-tab.directive'

/**
 * Pipes
 */
import { CapitalizePipe } from './common/pipes/capitalize/capitalize.pipe'
import { TranslinkPipe } from './common/services/translation/pipe/translink.pipe'
import { ValuemapPipe } from './common/pipes/valuemap/valuemap.pipe'
import { SafeStylePipe } from './common/pipes/safestyle/safestyle.pipe'

/**
 * Date customization
 */
import * as _moment from 'moment'
export const moment = _moment

export const MY_FORMATS = {
	parse: {
		dateInput: moment.localeData().longDateFormat('L'),
	},
	display: {
		dateInput: moment.localeData().longDateFormat('L'),
		monthYearLabel: 'MMM YYYY',
		dateA11yLabel: 'LL',
		monthYearA11yLabel: 'MMMM YYYY',
	},
}

/**
 * Components
 */
import { AppComponent } from './app.component'
import { NgqCardComponent } from './common/components/ngq-card/ngq-card.component'
import { NgqFooterComponent } from './common/components/ngq-footer/ngq-footer.component'
import { NgqHeaderComponent } from './views/header/components/ngq-header/ngq-header.component'
import { NgqActionsComponent } from './common/components/ngq-actions/ngq-actions.component'
import { NgqButtonComponent } from './common/components/ngq-button/ngq-button.component'
import { NgqGenericComponent } from './common/components/ngq-generic/ngq-generic.component'
import { NgqGenericLinkComponent } from './common/components/ngq-generic-link/ngq-generic-link.component'
import { NgqDescriptionComponent } from './common/components/ngq-description/ngq-description.component'
import { NgqFormComponent } from './common/components/ngq-form/ngq-form.component'
import { NgqRestDialogComponent } from './dialogs/rest-dialog/ngq-rest-dialog.component'
import { NgqAvatarComponent } from './common/components/ngq-avatar/ngq-avatar.component'
import { NgqLoadingComponent } from './common/services/loading/component/ngq-loading.component'
import { NgqResponseComponent } from './common/services/response/component/ngq-response.component'
import { NgqBarComponent } from './common/components/ngq-bar/ngq-bar.component'
import { NgqSearchComponent } from './common/components/ngq-search/ngq-search.component'
import { NgqViewComponent } from './routing/ngq-view/ngq-view.component'
import { NgqTilesComponent } from './views/tiles/components/ngq-tiles/ngq-tiles.component'
import { NgqTileComponent } from './views/tiles/components/ngq-tile/ngq-tile.component'
import { NgqSidebarCardsComponent } from './views/details/components/ngq-sidebar-cards/ngq-sidebar-cards.component'
import { NgqSidebarCardComponent } from './views/details/components/ngq-sidebar-card/ngq-sidebar-card.component'
import { NgqPaginationComponent } from './common/components/ngq-pagination/ngq-pagination.component'
import { NgqTranslationsComponent } from './views/translations/components/ngq-translations/ngq-translations.component'
import { NgqRestDialogBarComponent } from './dialogs/rest-dialog/rest-dialog-bar/ngq-rest-dialog-bar.component'
import { NgqPlanningComponent } from './views/planning/components/ngq-planning/ngq-planning.component'
import { NgqPlanningSidebarComponent } from './views/planning/components/ngq-planning-sidebar/ngq-planning-sidebar.component'
import { NgqPlanningFilterComponent } from './views/planning/components/ngq-planning-filter/ngq-planning-filter.component'
import { NgqPlanningGridComponent } from './views/planning/components/ngq-planning-grid/ngq-planning-grid.component'
import { NgqFormIndicatorComponent } from './common/components/ngq-form-indicator/ngq-form-indicator.component'
import { NgqAvatarRowComponent } from './common/components/ngq-avatar-row/ngq-avatar-row.component'
import { NgqFamilyComponent } from './views/persons/components/ngq-family/ngq-family.component'
import { NgqProviderselectComponent } from './views/details/components/ngq-providerselect/ngq-providerselect.component'
import { NgqPlanningShiftItemComponent } from './views/planning/components/ngq-planning-shift-item/ngq-planning-shift-item.component'
import { NgqOverviewListComponent } from './views/list/components/ngq-overview-list/ngq-overview-list.component'
import { NgqItemByKeysComponent } from './common/components/ngq-item-by-keys/ngq-item-by-keys.component'
import { NgqListComponent } from './common/components/ngq-list/ngq-list.component'
import { NgqLongtermComponent } from './views/longterm/components/ngq-longterm/ngq-longterm.component'
import { NgqLtListComponent } from './views/longterm/components/ngq-lt-list/ngq-lt-list.component'
import { NgqLtColumnComponent } from './views/longterm/components/ngq-lt-column/ngq-lt-column.component'
import { NgqLtListSearchComponent } from './views/longterm/components/ngq-lt-list-search/ngq-lt-list-search.component'
import { NgqLtDaysComponent } from './views/longterm/components/ngq-lt-days/ngq-lt-days.component'
import { NgqLtContractCardComponent } from './views/longterm/components/ngq-lt-contract-card/ngq-lt-contract-card.component'
import { NgqLtGroupAvailabilityOverviewComponent } from './views/longterm/components/ngq-lt-group-availability-overview/ngq-lt-group-availability-overview.component'
import { NgqObjectComponent } from './common/components/ngq-object/ngq-object.component'
import { NgqHeaderUserComponent } from './views/header/components/ngq-header-user/ngq-header-user.component'
import { NgqLoginDialogComponent } from './dialogs/login-dialog/login-dialog.component'
import { NgqSnackbarComponent } from './common/components/ngq-snackbar/ngq-snackbar.component'

const views = [
	NgqTilesComponent,
	NgqTileComponent,

	NgqOverviewListComponent,
	NgqTranslationsComponent,
	NgqFamilyComponent,

	NgqSidebarCardsComponent,
	NgqSidebarCardComponent,
	NgqProviderselectComponent,

	NgqPlanningComponent,
	NgqPlanningSidebarComponent,
	NgqPlanningFilterComponent,
	NgqPlanningGridComponent,
	NgqPlanningShiftItemComponent,

	NgqLongtermComponent,
	NgqLtListComponent,
	NgqLtColumnComponent,
	NgqLtListSearchComponent,
	NgqLtDaysComponent,
	NgqLtContractCardComponent,
	NgqLtGroupAvailabilityOverviewComponent,
]

const common = [
	NgqHeaderComponent,
	NgqFooterComponent,
	NgqBarComponent,
	NgqFormComponent,
	NgqCardComponent,
	NgqButtonComponent,
	NgqActionsComponent,
	NgqGenericComponent,
	NgqGenericLinkComponent,
	NgqLoadingComponent,
	NgqDescriptionComponent,
	NgqListComponent,
	NgqResponseComponent,
	NgqSearchComponent,
	NgqPaginationComponent,
	NgqAvatarComponent,
	NgqAvatarRowComponent,
	NgqItemByKeysComponent,
	NgqObjectComponent,
	NgqHeaderUserComponent,
]

const dialogs = [
	NgqRestDialogComponent,
	NgqRestDialogBarComponent,
	NgqFormIndicatorComponent,
	NgqLoginDialogComponent,
	NgqSnackbarComponent,
]

const directives = [
	LoadingDirective,
	ResponseDirective,
	DialogFormIntersectionDirective,
	MasonryDirective,
	ResizeDirective,
	TextareaTabDirective,
]

const pipes = [CapitalizePipe, TranslinkPipe, ValuemapPipe, SafeStylePipe]

@NgModule({
	declarations: [
		AppComponent,
		...directives,
		...pipes,
		...common,
		...dialogs,

		NgqViewComponent,
		...views,
		...FormlyImports,
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		HttpClientModule,
		BrowserAnimationsModule,
		FormsModule,
		ReactiveFormsModule,
		MatRippleModule,
		MatCheckboxModule,
		MatButtonModule,
		MatMenuModule,
		MatDatepickerModule,
		MatDialogModule,
		MatFormFieldModule,
		MatInputModule,
		MatRadioModule,
		MatSelectModule,
		MatTooltipModule,
		MatSnackBarModule,
		MatProgressBarModule,
		DragDropModule,
		ScrollingModule,
		MatTableModule,
		MatNativeDateModule,
		MatAutocompleteModule,

		TranslateModule.forRoot({
			loader: {
				provide: TranslateLoader,
				useFactory: HttpLoaderFactory,
				deps: [HttpClient],
			},
		}),

		FormlyFactory,
		FormlyMaterialModule,
		FormlyMatDatepickerModule,
		FormlyMatToggleModule,
	],
	providers: [
		StorageService,
		InterceptorService,
		LoadingService,
		ResponseService,
		TransLinkService,
		WebCancelService,
		WebService,
		RouterParamsService,
		WebServiceConfigProvider,
		WebServiceProvider,
		...OpenApiFactory,
		NgqBarService,
		FormlyValidatorService,

		// { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
		// { provide: DateAdapter, useClass: MatNativeDateModule, deps: [MAT_DATE_LOCALE] },

		{
			provide: APP_INITIALIZER,
			useFactory: AppInitializerFactory,
			multi: true,
			deps: [TranslateService],
		},
		{
			provide: HTTP_INTERCEPTORS,
			useExisting: InterceptorService,
			multi: true,
			deps: [WebCancelService],
		},

		{ provide: ErrorHandler, useFactory: provideErrorHandler },
	],
	entryComponents: [NgqLoadingComponent, NgqCardComponent, NgqResponseComponent],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	bootstrap: [AppComponent],
})
export class AppModule {
	constructor(private translate: TranslateService, private injector: Injector) {
		this.translate.setDefaultLang('nl')
		this.translate.use('nl')
		moment.locale('nl')
	}
}
