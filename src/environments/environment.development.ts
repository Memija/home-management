export const environment = {
  production: false,
  /**
   * Easily toggle this for development.
   *
   * IF TRUE, YOU MUST ALSO:
   * 1. Firebase Console: Add "localhost" to "Authorized domains"
   *    (Build > Authentication > Settings > Authorized domains)
   *
   * 2. Google Cloud Console: Add "http://localhost:4200" to "Authorized JavaScript origins"
   *    and "http://localhost:4200/__/auth/handler" to "Authorized redirect URIs"
   *    (Go to https://console.cloud.google.com/apis/credentials and edit your OAuth 2.0 Client ID)
   *
   * Note: Changes in Google Cloud Console can take 5-10 minutes to propagate.
   */
  allowLocalAuth: true
};
