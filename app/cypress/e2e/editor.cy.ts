describe('Editor', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForSession();
  });

  context('Layout', () => {
    it('shows the line counter textarea', () => {
      cy.get('#lineCounter').should('be.visible');
    });

    it('shows the editor textarea', () => {
      cy.get('#txtEditor').should('be.visible');
    });

    it('pre-fills editor with placeholder text', () => {
      cy.get('#txtEditor').should('contain.value', 'Type something here');
    });

    it('starts the line counter at "1."', () => {
      cy.get('#lineCounter').should('contain.value', '1.');
    });
  });

  context('Typing', () => {
    it('allows typing in the editor', () => {
      cy.get('#txtEditor').click().clear().type('hello world');
      cy.get('#txtEditor').should('have.value', 'hello world');
    });

    it('updates line counter when new lines are added', () => {
      cy.get('#txtEditor').click().clear().type('line1{enter}line2{enter}line3');
      cy.get('#lineCounter').should('contain.value', '3.');
    });

    it('reduces line counter when lines are removed', () => {
      cy.get('#txtEditor').click().clear().type('a{enter}b{enter}c');
      cy.get('#lineCounter').should('contain.value', '3.');
      cy.get('#txtEditor').click().clear().type('one line only');
      cy.get('#lineCounter').should('not.contain.value', '2.');
    });

    it('inserts a tab character when Tab key is pressed', () => {
      cy.get('#txtEditor').click().clear().type('before');
      cy.get('#txtEditor').trigger('keydown', { key: 'Tab', code: 'Tab' });
      cy.get('#txtEditor').invoke('val').should('contain', '\t');
    });
  });

  context('Line counter sync', () => {
    it('scrolls line counter when editor scrolls', () => {
      cy.get('#txtEditor').click().clear();
      const manyLines = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join('{enter}');
      cy.get('#txtEditor').type(manyLines);

      cy.get('#txtEditor').then(($el) => {
        $el[0].scrollTop = 200;
        $el.trigger('scroll');
      });
      cy.get('#lineCounter').should(($el) => {
        expect($el[0].scrollTop).to.equal(200);
      });
    });
  });
});
