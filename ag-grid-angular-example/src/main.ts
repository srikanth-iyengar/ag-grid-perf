import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerMockServer } from './app/mock-server';

async function bootstrap() {
  await registerMockServer();

  await bootstrapApplication(AppComponent, {
    providers: [
      provideAnimations()
    ]
  });
}

bootstrap().catch((err) => console.error(err));
