import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { App } from './app';
import { StoreModule } from '@ngrx/store';
import { practiceReducer } from './core/states/practice-test/practice.reducer';

@NgModule({
  imports: [BrowserModule, StoreModule.forRoot({ practice: practiceReducer })],
  providers: [],
})
export class AppModule {}
