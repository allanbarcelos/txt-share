import './commands';

// Silence known ngx-toastr and zone.js console noise in tests
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver') || err.message.includes('Zone')) {
    return false;
  }
  return true;
});
