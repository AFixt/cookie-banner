/**
 * Angular Example of Accessible Cookie Banner
 * This file demonstrates how to use the cookie banner in an Angular application
 */

import { Component, OnInit, OnDestroy } from '@angular/core';

// In a real application, you would need to create a proper Angular service
// This is a simplified example for demonstration purposes

declare global {
  interface Window {
    CookieBanner: any;
    ConsentManager: any;
  }
}

@Component({
  selector: 'app-consent-manager',
  template: `
    <div class="consent-manager">
      <h2>Consent Management Component</h2>

      <div class="consent-status">
        <h3>Current Consent Status:</h3>
        <pre *ngIf="consent">{{ consentJson }}</pre>
        <p *ngIf="!consent">No consent data found</p>
      </div>

      <button (click)="resetConsent()">Reset Consent</button>
    </div>
  `,
  styles: [
    `
      .consent-manager {
        margin: 2rem 0;
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
      }

      button {
        padding: 0.5rem 1rem;
        margin-top: 1rem;
        background: #0056b3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }

      button:hover {
        background: #003d82;
      }

      button:focus {
        outline: 3px solid #4d90fe;
      }

      pre {
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
      }
    `,
  ],
})
export class ConsentManagerComponent implements OnInit, OnDestroy {
  consent: any = null;
  private consentChangedListener: (e: CustomEvent) => void;

  get consentJson(): string {
    return JSON.stringify(this.consent, null, 2);
  }

  ngOnInit() {
    // Initialize the cookie banner when the component initializes
    window.CookieBanner.init({
      locale: 'en',
      theme: 'light',
      showModal: true,
      onConsentChange: (newConsent: any) => {
        console.log('Consent changed:', newConsent);
        this.consent = newConsent;

        // Conditionally load scripts based on consent
        if (newConsent.analytics) {
          this.loadAnalytics();
        }

        if (newConsent.marketing) {
          this.loadMarketingScripts();
        }
      },
    });

    // Check initial consent
    this.consent = window.CookieBanner.getConsent();

    // Listen for consent change events
    this.consentChangedListener = (e: CustomEvent) => {
      this.consent = e.detail;
    };

    document.addEventListener('cookieConsentChanged', this.consentChangedListener as EventListener);
  }

  ngOnDestroy() {
    // Clean up event listener when component is destroyed
    document.removeEventListener(
      'cookieConsentChanged',
      this.consentChangedListener as EventListener
    );
  }

  loadAnalytics() {
    console.log('Loading analytics...');
    // In a real app, you would load your analytics script here
  }

  loadMarketingScripts() {
    console.log('Loading marketing scripts...');
    // In a real app, you would load marketing scripts here
  }

  resetConsent() {
    // Create a ConsentManager instance to access clearConsent method
    const manager = new window.ConsentManager();
    manager.clearConsent();
    window.location.reload();
  }
}

// Example of a service to manage consent in a more Angular-like way
// This would be in a separate file in a real application

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConsentState {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp?: string;
  [key: string]: any; // For custom categories
}

@Injectable({
  providedIn: 'root',
})
export class ConsentService {
  private consentSubject = new BehaviorSubject<ConsentState | null>(null);
  consent$ = this.consentSubject.asObservable();

  constructor() {
    // Initialize consent banner
    this.initBanner();

    // Listen for consent changes
    document.addEventListener('cookieConsentChanged', ((e: CustomEvent) => {
      this.consentSubject.next(e.detail);
    }) as EventListener);
  }

  private initBanner() {
    window.CookieBanner.init({
      locale: 'en',
      theme: 'light',
      showModal: true,
      onConsentChange: (consent: ConsentState) => {
        this.consentSubject.next(consent);
      },
    });

    // Set initial consent value
    const initialConsent = window.CookieBanner.getConsent();
    this.consentSubject.next(initialConsent);
  }

  hasConsent(category: string): boolean {
    const consent = this.consentSubject.value;
    return consent ? !!consent[category] : false;
  }

  resetConsent(): void {
    const manager = new window.ConsentManager();
    manager.clearConsent();
    window.location.reload();
  }
}

/**
 * Note: This is a demonstration file only.
 *
 * To use in a real Angular application:
 *
 * 1. Install the package: npm install accessible-cookie-banner
 * 2. Import the styles in your angular.json or component
 * 3. Create a proper service to manage consent state
 * 4. Initialize the banner in your service or app component
 *
 * You'll also need to properly declare types or create typings for the library
 * if you're using TypeScript strictly.
 */
