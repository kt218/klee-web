var app = angular.module('app', [

    // Vendor
    'ngResource',
    'ngCookies',
    'ngAnimate',
    'ngSanitize',
    'ui.codemirror',
    'ui.bootstrap',
    'ui.bootstrap.dropdown',
    'ui.slider',
    'angularFileUpload',
    'hc.marked',

    // App
    'services',
    'controllers',
    'filters',
    'directives',
]);

app.config([
    '$httpProvider', '$interpolateProvider', '$resourceProvider',
    'markedProvider',
    function ($httpProvider, $interpolateProvider, $resourceProvider,
              markedProvider) {
        $interpolateProvider.startSymbol('[[');
        $interpolateProvider.endSymbol(']]');
        $resourceProvider.defaults.stripTrailingSlashes = false;
        markedProvider.setOptions({
            gfm: true,
            tables: true,
            breaks: false,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: false,
            highlight: function (code, lang) {
                if (lang) {
                    return hljs.highlight(lang, code, true).value;
                } else {
                    return hljs.highlightAuto(code).value;
                }
            }
        });
    }
]);

app.run([
    '$http', '$cookies',
    function ($http, $cookies) {
        $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
        $http.defaults.headers.put['X-CSRFToken'] = $cookies.csrftoken;
        $http.defaults.headers.common['X-CSRFToken'] = $cookies.csrftoken;
    }
]);
