import { NgModule, importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

//import { SettingsPageRoutingModule } from './settings-routing.module';

import { SettingsPage } from './settings.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    //SettingsPageRoutingModule,
    RouterModule.forChild([{ path: '', component: SettingsPage }])
  ],
  declarations: []
})
export class SettingsPageModule {}
