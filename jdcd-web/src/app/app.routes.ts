import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: 'portfolio', pathMatch: 'full' },
    { path: 'portfolio', loadComponent: () => import('./portfolio-page-component/portfolio-page-component').then(m => m.PortfolioPageComponent) },
    { path: 'contact', loadComponent: () => import('./contact-page-component/contact-page-component').then(m => m.ContactPageComponent) },
    { path: '**', redirectTo: 'portfolio' }
];
