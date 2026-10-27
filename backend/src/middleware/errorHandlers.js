module.exports = {
  notFoundHandler: (req, res, next) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
  },
  errorHandler: (err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ success: false, message });
  }
};
