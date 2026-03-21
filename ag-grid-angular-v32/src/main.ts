import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ModuleRegistry } from 'ag-grid-community';
import { registerMockServer } from './app/mock-server';

async function registerEnterpriseModules() {
  const agGridEnterprise = await import('ag-grid-enterprise');
  const allEnterpriseModule = (agGridEnterprise as unknown as { AllEnterpriseModule?: unknown }).AllEnterpriseModule;

  if (allEnterpriseModule) {
    ModuleRegistry.registerModules([allEnterpriseModule as never]);
  }
}

async function bootstrap() {
  await registerEnterpriseModules();
  await registerMockServer();

  await bootstrapApplication(AppComponent, {
    providers: [
      provideAnimations()
    ]
  });
}

bootstrap().catch((err) => console.error(err));
