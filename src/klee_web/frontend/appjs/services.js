var services = angular.module('services', ['ngResource']);

services.factory('Project', [
    '$resource',
    function($resource) {
        return $resource('/api/projects/:id/?game=:game', {
            id: '@id',
            game: '@game'
        }, {
            'update': {
                method: 'PUT'
            }
        });
    }
]);

services.factory('File', [
    '$resource',
    function($resource) {
        return $resource('/api/projects/:projectId/files/:fileId', {
            projectId: '@projectId',
            fileId: '@id'
        }, {
            'update': {
                method: 'PUT'
            }
        });
    }
]);

services.factory('GameChallenge', [
    '$resource',
    function($resource) {
        return $resource('/api/projects/:projectId/challenges/:challengeId', {
            projectId: '@projectId',
            challengeId: '@id'
        }, {
            'update': {
                method: 'PUT'
            }
        })
    }
]);

services.factory('ChallengeFile', [
    '$resource',
    function($resource) {
        return $resource('/api/projects/:projectId/challenges/:challengeId/files/:fileId', {
            projectId: '@projectId',
            challengeId: '@challengeId',
            fileId: '@id'
        }, {
            'update': {
                method: 'PUT'
            }
        });
    }
]);
