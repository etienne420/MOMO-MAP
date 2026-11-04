class HttpError extends Error {
  constructor(message, statusCode) {
    super(message); // Ajoute un message d'erreur
    this.statusCode = statusCode; // Définit le code de statut HTTP de l'erreur
  }
}

export default HttpError;
