import { Routes } from '@angular/router';
import { PortfolioPageComponent } from './portfolio-page-component/portfolio-page-component';
import { ContactPageComponent } from './contact-page-component/contact-page-component';

export const routes: Routes = [
    { path: '', redirectTo: 'portfolio', pathMatch: 'full' },
    { path: 'portfolio', component: PortfolioPageComponent },
    { path: 'contact', component: ContactPageComponent },
    { path: '**', redirectTo: 'portfolio' }
];
