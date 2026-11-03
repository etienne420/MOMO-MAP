function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = Number(error.statusCode || error.status || error.code);
  const safeStatusCode =
    Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600
      ? statusCode
      : 500;

  res.status(safeStatusCode);
  res.json({ message: error.message || "Une erreur inconnue est survenue !" });
}
export default errorHandler;
