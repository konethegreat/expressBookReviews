// Port the server listens on (5000 unless the PORT environment variable is set).
// The /async/* routes call the server on this same port.
module.exports.PORT = process.env.PORT || 5000;
