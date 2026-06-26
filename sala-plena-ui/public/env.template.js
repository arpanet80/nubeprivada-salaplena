(function(window) {
    window.env = window.env || {};

    // Environment variables
    window["env"]["apiUrl"] = "${API_URL}";
    window["env"]["apiUsuarios"] = "${API_URL_USER}";
    window["env"]["reportsUrl"] = "${REPORTS_URL}";
    window["env"]["debug"] = "${DEBUG}";
  })(this);
