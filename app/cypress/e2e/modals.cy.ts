describe('Modals', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForSession();
  });

  // ── Share Modal ─────────────────────────────────────────────────────────────

  context('Share Modal', () => {
    beforeEach(() => cy.openShareModal());

    it('opens when Share button is clicked', () => {
      cy.get('.card-header').should('contain', 'Share TXT Share');
    });

    it('shows the current session URL in the input', () => {
      cy.location('href').then((href) => {
        cy.get('.card-body input.form-control').should('have.value', href);
      });
    });

    it('has a clipboard copy button', () => {
      cy.get('.card-body button.btn-outline-secondary').should('be.visible');
    });

    it('shows a WhatsApp share link', () => {
      cy.contains('a', 'Whatsapp').should('be.visible');
    });

    it('shows a Telegram share link', () => {
      cy.contains('a', 'Telegram').should('be.visible');
    });

    it('shows a Teams share link', () => {
      cy.contains('a', 'Teams').should('be.visible');
    });

    it('WhatsApp link contains the session URL', () => {
      cy.location('href').then((href) => {
        cy.contains('a', 'Whatsapp')
          .should('have.attr', 'href')
          .and('include', encodeURIComponent(href).slice(0, 10));
      });
    });
  });

  // ── Info Modal ──────────────────────────────────────────────────────────────

  context('Info Modal', () => {
    beforeEach(() => cy.openInfoModal());

    it('opens when the ? button is clicked', () => {
      cy.get('.card-header').should('contain', 'About TXT Share');
    });

    it('shows a description mentioning TXT Share', () => {
      cy.get('.card-body').should('contain', 'TXT Share');
    });

    it('contains a GitHub link', () => {
      cy.get('.card-body a[href*="github.com"]').should('exist');
    });

    it('contains a Buy Me a Coffee link', () => {
      cy.get('.card-body a[href*="buymeacoffee.com"]').should('exist');
    });
  });
});
