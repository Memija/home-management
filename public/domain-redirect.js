// Redirect default Firebase domains to the custom domain
if (
  window.location.hostname === 'home-management-be965.web.app' ||
  window.location.hostname === 'home-management-be965.firebaseapp.com'
) {
  window.location.replace(
    'https://home-management.dev' +
      window.location.pathname +
      window.location.search +
      window.location.hash,
  );
}
