import { FirebaseError } from "firebase/app";

/**
 * Maps a sign-in / auth error into a friendly, user-facing message.
 *
 * Centralized so every caller (login page, and any future auth entry points)
 * surfaces consistent wording for the common Firebase auth failure codes.
 * User-cancelled popups are treated as benign and can be ignored by callers.
 */
export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "The Google sign-in window was closed before finishing.";
      case "auth/popup-blocked":
        return "Your browser blocked the sign-in popup. Allow popups and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again in a moment.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/unauthorized-domain":
        return "This domain isn't authorized for sign-in yet.";
      case "auth/operation-not-allowed":
        return "Google sign-in isn't enabled for this app.";
      case "auth/internal-error":
        return "Sign-in failed unexpectedly. Please try again.";
      default:
        return error.message.replace("Firebase: ", "");
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

/**
 * Whether an error represents the user simply dismissing the sign-in popup
 * (no real failure). Callers may choose to silently ignore these.
 */
export function isBenignAuthCancellation(error: unknown): boolean {
  return (
    error instanceof FirebaseError &&
    (error.code === "auth/popup-closed-by-user" ||
      error.code === "auth/cancelled-popup-request")
  );
}
