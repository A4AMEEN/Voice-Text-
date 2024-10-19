import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { VoiceToTextComponent } from './voice-to-text/voice-to-text.component';
import { HttpClientModule } from '@angular/common/http';



@NgModule({
  declarations: [
    AppComponent,
    VoiceToTextComponent
  ],
  
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,

   
    
 
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
