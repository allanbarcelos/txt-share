describe('Navigation', () => {
  context('Initial load', () => {
    it('redirects to a session URL after connecting', () => {
      cy.visit('/');
      cy.waitForSession();
      cy.location('pathname').should('match', /^\/s_[a-z0-9]{7}$/);
    });

    it('session id matches the s_ prefix pattern', () => {
      cy.visit('/');
      cy.waitForSession();
      cy.location('pathname').then((path) => {
        expect(path).to.match(/^\/s_[a-z0-9]{7}$/);
      });
    });

    it('each new load creates a unique session', () => {
      cy.visit('/');
      cy.waitForSession();
      cy.location('pathname').as('firstPath');

      cy.visit('/');
      cy.waitForSession();
      cy.location('pathname').then((secondPath) => {
        cy.get('@firstPath').should('not.equal', secondPath);
      });
    });
  });

  context('Direct session URL', () => {
    it('loads an existing session when navigating to its URL directly', () => {
      cy.visit('/');
      cy.waitForSession();
      cy.location('pathname').then((path) => {
        cy.get('#txtEditor').click().clear().type('persistent content');
        cy.visit(path);
        cy.waitForSession();
        cy.get('#txtEditor').should('contain.value', 'persistent content');
      });
    });

    it('creates a new session when navigating to an invalid id', () => {
      cy.visit('/s_invalid');
      cy.waitForSession();
      cy.location('pathname').should('match', /^\/s_[a-z0-9]{7}$/);
    });
  });

  context('New TXT button', () => {
    it('navigates to a new session URL when New is clicked', () => {
      cy.visit('/');
      cy.waitForSession();
      cy.location('pathname').as('oldPath');

      cy.get('[title="New TXT"]').click();
      cy.waitForSession();

      cy.location('pathname').then((newPath) => {
        cy.get('@oldPath').should('not.equal', newPath);
      });
    });
  });
});
