/// <reference types="cypress" />

// Wait for Socket.IO to connect and the app to receive a session
Cypress.Commands.add('waitForSession', () => {
  // URL changes to /:id once _startTXT is received
  cy.location('pathname', { timeout: 10000 }).should('match', /^\/s_[a-z0-9]{7}$/);
});

// Type into the editor and wait for the value to settle
Cypress.Commands.add('typeInEditor', (text: string) => {
  cy.get('#txtEditor').click().clear().type(text, { delay: 20 });
});

// Open the share modal
Cypress.Commands.add('openShareModal', () => {
  cy.get('[title="Share TXT"]').click();
  cy.get('.card-header').should('contain', 'Share TXT Share');
});

// Open the info modal
Cypress.Commands.add('openInfoModal', () => {
  cy.get('button.btn-outline-info').first().click();
  cy.get('.card-header').should('contain', 'About TXT Share');
});

declare global {
  namespace Cypress {
    interface Chainable {
      waitForSession(): Chainable<void>;
      typeInEditor(text: string): Chainable<void>;
      openShareModal(): Chainable<void>;
      openInfoModal(): Chainable<void>;
    }
  }
}
