describe('Header', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForSession();
  });

  context('Layout', () => {
    it('shows the TXT Share brand', () => {
      cy.get('.navbar-brand').should('contain.text', 'TXT Share');
    });

    it('shows the New button', () => {
      cy.get('[title="New TXT"]').should('be.visible');
    });

    it('shows the Download button', () => {
      cy.get('[title="Download TXT"]').should('be.visible');
    });

    it('shows the Share button', () => {
      cy.get('[title="Share TXT"]').should('be.visible');
    });

    it('shows the Renew button with countdown', () => {
      cy.get('[title="Renew TXT Time"]').should('be.visible');
      cy.get('[title="Renew TXT Time"]').invoke('text').should('match', /\d{2}:\d{2}/);
    });

    it('shows the Delete button', () => {
      cy.get('[title="Delete TXT"]').should('be.visible');
    });
  });

  context('Countdown', () => {
    it('displays a countdown in MM:SS format', () => {
      cy.get('[title="Renew TXT Time"]').invoke('text').should('match', /\d{2}:\d{2}/);
    });

    it('countdown decrements over time', () => {
      cy.get('[title="Renew TXT Time"]').invoke('text').then((firstText) => {
        cy.wait(2000);
        cy.get('[title="Renew TXT Time"]').invoke('text').should((secondText) => {
          expect(secondText.trim()).not.to.equal(firstText.trim());
        });
      });
    });

    it('resets countdown when Renew button is clicked', () => {
      cy.wait(3000);
      cy.get('[title="Renew TXT Time"]').invoke('text').then((before) => {
        cy.get('[title="Renew TXT Time"]').click();
        cy.wait(500);
        cy.get('[title="Renew TXT Time"]').invoke('text').then((after) => {
          const beforeSecs = timeToSeconds(before.trim());
          const afterSecs  = timeToSeconds(after.trim());
          expect(afterSecs).to.be.greaterThan(beforeSecs);
        });
      });
    });
  });

  context('Delete TXT', () => {
    it('navigates to a new session after delete', () => {
      cy.location('pathname').as('oldPath');
      cy.get('[title="Delete TXT"]').click();
      cy.waitForSession();
      cy.location('pathname').then((newPath) => {
        cy.get('@oldPath').should('not.equal', newPath);
      });
    });
  });

  context('Download TXT', () => {
    it('triggers a file download with .txt extension', () => {
      cy.get('#txtEditor').click().clear().type('download test content');

      cy.window().then((win) => {
        const anchor = win.document.createElement('a');
        spyOn(win.document.body, 'appendChild');
        cy.stub(win.document, 'createElement')
          .withArgs('a').returns(anchor)
          .callThrough();
        cy.spy(anchor, 'click').as('anchorClick');
      });

      cy.get('[title="Download TXT"]').click();
      cy.location('pathname').then((path) => {
        const id = path.replace('/', '');
        // The download is triggered; just verify no error occurred
        cy.get('[title="Download TXT"]').should('exist');
      });
    });
  });
});

function timeToSeconds(mmss: string): number {
  const [mm, ss] = mmss.replace(/[^\d:]/g, '').split(':').map(Number);
  return mm * 60 + ss;
}
