var controllers = angular.module('controllers', []);

controllers.controller('MainCtrl', [
    '$scope', '$http', '$rootScope', 'Project', 'File', 'GameChallenge',
    'ChallengeFile', '$interval',
    function($scope, $http, $rootScope, Project, File, GameChallenge,
             ChallengeFile, $interval) {

        $scope.submission = {
            name: null,
            code: ''
        };

        $scope.opts = {
            symArgs: false,
            symFiles: false,
            symIn: false,
            options: false,
            arguments: false
        };
        
        $scope.config = {
              symArgs: {
                  range: [0, 0],
                  size: 0
              },
              symFiles: {
                  num: 0,
                  size: 0
              },
              symIn: {
                  size: 0
              },
              options: '',
              arguments: ''
        }
        
        $scope.submission.runConfiguration = angular.copy($scope.config);
        $scope.defaultSubmission = angular.copy($scope.submission);

        $scope.progress = [];
        $scope.result = {};
        $scope.submitted = false;

        $scope.editor = null;
        $scope.selectedProject = null;

        $scope.projects = [];
        $scope.files = [];
        $scope.challenges = [];
        $scope.challenge = {
            name: null,
            md: '# Loading task...',
            mainCode: {
                name: null,
                code: '// Loading main code...',
            },
            solutionCode: '// Loading solution code...',
            templateCode: '// Loading template...',
        };

        $scope.toggleSymArgs = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.opts.symArgs = !$scope.opts.symArgs;
        };

        $scope.toggleSymFiles = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.opts.symFiles = !$scope.opts.symFiles;
        };
        
        $scope.toggleSymIn = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.opts.symIn = !$scope.opts.symIn;
        };

        $scope.toggleOptions = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.opts.options = !$scope.opts.options;
            $scope.opts.arguments = !$scope.opts.arguments;
        };
        
        $scope.resetLoadedFile = function() {
            $scope.submission = angular.copy($scope.defaultSubmission);
            console.log('resetLoadedFile', $scope.submission.code);
        }

        var saveTimeout = null;
        var lastSaveTime = 0;
        const MIN_SAVE_INTERVAL = 2000; // 2 seconds

        var saveSubmission = function() {
            var submission = $scope.submission;
            if (!angular.isUndefined($scope.submission.$update) && !$scope.selectedProject.example) {
                File.update({}, submission);
            }

            lastSaveTime = Date.now();
            saveTimeout = null;
        };

        $scope.$watch('submission', function(newVal, oldVal) {
            if (newVal !== oldVal && saveTimeout == null) {
                var nextSave = ((lastSaveTime + MIN_SAVE_INTERVAL) - Date.now());
                var timeToSave = Math.max(nextSave, 0);
                saveTimeout = setTimeout(saveSubmission, timeToSave);

                if (newVal.challengeId === oldVal.challengeId) {
                    $scope.challenge.templateCode = newVal.code;
                    console.log('Save editor to challenge template');
                }
                console.log('$watch submission');
            }
        }, true);
        
        var buildConfiguration = function() {
            for (opt in $scope.opts) {
                $scope.submission.runConfiguration[opt] 
                    = $scope.opts[opt] ? $scope.config[opt] 
                    : $scope.defaultSubmission.runConfiguration[opt]
            }
        };

        $scope.processForm = function(submission) {
            buildConfiguration();
            $rootScope.startNanobar();
            $scope.submitted = true;
            $scope.result = {};
            $scope.progress = [];
            $scope.progress.push('Job queued!');
            const submissionCopy = angular.copy(submission);

            if ($scope.selectedProject.game) {
                submissionCopy.code = $scope.challenge.mainCode.code +
                    '\n\n' + submission.code;
                submissionCopy.runConfiguration.coverage_enabled = true;
                submissionCopy.runConfiguration.options +=
                    '--external-calls=all ' +
                    '-max-time=10min';
                // TODO: move these to fixtures
                // TODO: add more options for search-heuristics
            }

            // Send data to submit endpoint
            $http
                .post('/api/jobs/submit/', submissionCopy)

            // We get a task id from submitting!
            .success(
              function(data, status, headers) {
                taskId = data.taskId;
                var fetch = $interval(function () {
                  $http.get('/jobs/status/' + taskId + '/').success(function(data, status, headers) {
                    m = angular.fromJson(data);
                    var type = m['type'];
                    if(type == 'notification') {
                      data = angular.fromJson(m.data);
                      $scope.progress.push(data.message);
                    } else {
                      $scope.submitted = false;
                      data = angular.fromJson(m.data);
                      if(type == 'job_complete') $scope.progress.push('Done!');
                      $scope.result = data;
                      $rootScope.finishNanobar();
                      $interval.cancel(fetch);
                    }
                  });
                }, 1000);

              }
            )

            // We didn't even get a task back from submit
            .error(
              function(data, status, headers) {
                console.debug('Error! ', data);
                $rootScope.finishNanobar();
              }
            );
        };

        $scope.codemirrorLoaded = function(_editor) {
            $scope.editor = _editor;

            _editor.setOption('viewportMargin', 5);
            _editor.setOption('lineWrapping', true);
            _editor.setOption('lineNumbers', true);
            _editor.setOption('mode', {
                name: 'text/x-csrc',
                useCPP: true
            });
            _editor.setOption('readOnly', 'nocursor');
            _editor.setOption('theme', 'neo');
        };

        $scope.drawCoverage = function(coverage) {
            $scope.editor.setValue($scope.submission.code);

            let offset = 0;
            if ($scope.selectedProject.game) {
                offset = $scope.challenge.mainCode.code.split("\n").length + 1;
            }

            let linesHit = 0;
            let linesTotal = 0;
            const lines = coverage.lines;
            const codeLength = $scope.submission.code.split("\n").length;
            for (let i = 0; i < codeLength; i++) {
                console.log(lines.length, i, offset, codeLength);
                var hit = lines[i + offset].hit;
                if (hit == null) {
                    $scope.editor.addLineClass(i, 'wrap', 'line-null');
                } else {
                    if (hit > 0) {
                        linesHit += 1;
                        $scope.editor.addLineClass(i, 'wrap', 'line-hit');
                    } else {
                        $scope.editor.addLineClass(i, 'wrap', 'line-miss');
                    }
                    linesTotal += 1;
                }
            }
            $scope.editor.addLineClass(lines.length, 'wrap', 'line-null');

            $scope.linePercentage = (linesHit / linesTotal).toFixed(2) * 100;

            $scope.editor.focus();
        };

        $scope.$watch('result', function (result) {
            if (!(angular.isUndefined(result.coverage) || result.coverage === null)) {
                $scope.drawCoverage(result.coverage.gcov[0]);
            }
        });
    }
]);


controllers.controller('EditorCtrl', [
    '$scope',
    function($scope) {
        $scope.editorOptions = {
            viewportMargin: 5,
            lineWrapping: true,
            lineNumbers: true,
            mode: {
                name: 'text/x-csrc',
                useCPP: true
            },
            theme: 'neo'
        };

        $scope.$parent.tabs = {
            task: {
                active: true
            },
            solution: {
                active: false
            },
            main: {
                active: false
            },
        };

        $scope.hideAllTabs = function() {
            angular.forEach($scope.$parent.tabs, function(tab, name) {
                $scope.$parent.tabs[name].active = false;
            });
        };

        $scope.setTab = function(tab) {
            if (tab in $scope.$parent.tabs) {
                $scope.hideAllTabs();
                $scope.$parent.tabs[tab].active = true;
            }
        };
    }
]);


controllers.controller('SidebarCtrl', [
    '$scope', 'Project', 'File', 'GameChallenge', 'ChallengeFile', 'FileUploader',
    '$cookies', '$location',
    function($scope, Project, File, GameChallenge, ChallengeFile, FileUploader,
             $cookies, $location) {

        function refreshFiles (projectId, selectedFileId) {
            var refreshFiles = File.query({
                projectId: projectId
            }).$promise;

            refreshFiles.then(function (files) {
                $scope.files = files;
                var selectedFile = _.findWhere($scope.files, {
                    id: selectedFileId
                });
                $scope.selectFile(selectedFile);
            });
        }

        function refreshChallenges(projectId, selectedChallengeId) {
            let selectedChallenge;

            GameChallenge.query({
                projectId: projectId
            }).$promise.then(function(challenges) {
                $scope.challenges = challenges;
                if (!selectedChallengeId) {
                    selectedChallenge = challenges[0];
                } else {
                    selectedChallenge = _.findWhere($scope.challenges, {
                        id: selectedChallengeId
                    });
                }
                $scope.selectChallenge(selectedChallenge);
            });
        }

        function refreshChallengeFiles(projectId, selectedChallengeId) {
            return ChallengeFile.query({
                projectId: projectId,
                challengeId: selectedChallengeId,
            }).$promise.then(function(files) {
                $scope.files = files;
                return files;
            });
        }

        $scope.projectToAdd = false;
        $scope.newFile = {
            name: '',
            showForm: false
        };
        $scope.newProjectOpt = {
            name: 'Add New Project',
            auth: false
        };

        $scope.uploader = new FileUploader({
            withCredentials: true,
            autoUpload: true,
            removeAfterUpload: true,
            headers: {
                'X-CSRFToken': $cookies.csrftoken
            },
            onSuccessItem: function (item, response, status, headers) {
                refreshFiles($scope.selectedProject.id, response.id);
            },
            onErrorItem: function (item, response, status, headers) {
                alert('Upload failed. Please make sure you\'re uploading a valid file and try again.');
            },
        });

        Project.query({
            game: $location.absUrl().includes('game')
        }).$promise.then(function(projects) {
            $scope.projects = projects;
            $scope.projects.push($scope.newProjectOpt);

            if (projects.length > 0) {
                $scope.$parent.selectedProject = projects[0];
            }
        });

        $scope.$watch('selectedProject', function(project) {
            if (!(_.isNull(project) || _.isUndefined(project))) {
                if (project.name == 'Add New Project') {
                    $scope.projectToAdd = true;
                } else {
                    // Update file uploader
                    $scope.uploader.url = 'api/projects/' + project.id + '/files/upload/';

                    if (project.game) {
                        refreshChallenges(project.id, project.defaultChallenge);
                    } else {
                        refreshFiles(project.id, project.defaultFile);
                    }
                }
                /*// Switch to /game when selectedProject is a GameChallenge
                if (project.game && $location.path() !== '/game') {
                    console.log($location.path());
                    $location.path('/game');
                }
                // Back to home if not game
                if (!project.game && $location.path() !== '/') {
                    console.log($location.path());
                    $location.path('/');
                }*/
            } else {
                // TODO: Needed? Back to home if not game
                /*if (!project.game && $location.path() !== '/') {
                    $location.path('/');
                }
                if ($location.path() === '/game') {
                    $scope.$parent.selectedProject = $scope.$parent.projects[2];
                }*/
                $scope.files = [];
                $scope.challenges = [];
                $scope.resetLoadedFile();
            }
        });

        $scope.selectFile = function (file) {
            if (!angular.isUndefined(file)) {
                var selectedProject = $scope.$parent.selectedProject;
                $scope.$parent.submission = file;
                selectedProject.defaultFile = file.id;
                for (opt in $scope.opts) {
                  if (file.runConfiguration[opt].size) {
                    $scope.opts[opt] = true;
                  }
                }
                $scope.$parent.config = file.runConfiguration;
                if (!selectedProject.example) {
                    selectedProject.$update();
                }
            } else {
                $scope.resetLoadedFile();
            }
        };

        $scope.selectChallenge = function(challenge) {
            const selectedProject = $scope.$parent.selectedProject;
            $scope.$parent.challenge = challenge;
            refreshChallengeFiles(selectedProject.id, challenge.id)
                .then(function() {
                    if (!!$scope.files.length) {
                        // TODO: fix so that default will be user's actual code file
                        const file = $scope.files[0];
                        $scope.$parent.submission = file;
                        challenge.defaultUserCode = file;
                    } else {
                        const submission = $scope.$parent.submission;
                        submission.name = challenge.name;
                        submission.code = challenge.templateCode;
                        submission.projectId = challenge.projectId;
                        submission.challengeId = challenge.id;
                        challenge.defaultUserCode = submission;
                    }
                    selectedProject.defaultChallenge = challenge.id;
                    const solutionCode = challenge.mainCode;
                    for (opt in $scope.opts) {
                        if (
                            solutionCode.runConfiguration &&
                            solutionCode.runConfiguration[opt] &&
                            solutionCode.runConfiguration[opt].size
                        ) {
                            $scope.opts[opt] = true;
                        }
                    }
                    $scope.$parent.config = solutionCode.runConfiguration;
                });
        };

        $scope.resetProjectSelector = function() {
            $scope.projectToAdd = false;
            $scope.$parent.selectedProject = null;
        };

        $scope.addProject = function (projectName) {
            var newProject = new Project({
                name: projectName
            });
            newProject.$save(function(project) {
                $scope.projects.push(project);
                $scope.$parent.selectedProject = project;
                $scope.projectToAdd = false;
            });
        };

        $scope.showAddFile = function() {
            $scope.newFile.showForm = true;
        };

        $scope.addFile = function() {
            var filename = $scope.newFile.name;
            // Hacky force append '.c'
            var re = /\.c$/;
            if (!re.test(filename)) {
                filename = filename + '.c';
            }

            var blankFile = new File({
                projectId: $scope.$parent.selectedProject.id,
                name: filename,
                code: '// Edit ' + filename,
                runConfiguration: {
                    symArgs: {
                        range: [0, 0],
                        size: 0
                    },
                    symFiles: {
                        num: 0,
                        size: 0
                    },
                    symIn: {
                        size: 0
                    },
                    options: '',
                    arguments: ''
                }
            });

            blankFile.$save(function(newFile) {
                $scope.files.unshift(newFile);
                $scope.newFile.name = '';
                $scope.newFile.showForm = false;

                $scope.selectFile(blankFile);
            });
        };

        $scope.deleteFile = function(file) {
            file.$delete(function () {
                // If we're deleting the current file, reset the editor
                if (file == $scope.submission) {
                    $scope.resetLoadedFile();
                }

                // Remove from file list
                $scope.files = _.without($scope.files, file);
            });
        };

    }
]);


controllers.controller('ResultTabsCtrl', [
    '$scope',
    function($scope) {
        $scope.tabs = {
            output: {
                active: true
            },
            stats: {
                active: false
            },
            coverage: {
                active: false
            },
            testcases: {
                active: false
            },
            replays: {
                active: false
            },
        };

        $scope.passedNo = 0;
        $scope.failedNo = 0;

        $scope.replays = [];

        $scope.hideAllTabs = function() {
            angular.forEach($scope.tabs, function(tab, name) {
                $scope.tabs[name].active = false;
            });
        };

        $scope.setTab = function(tab) {
            if (tab in $scope.tabs) {
                $scope.hideAllTabs();
                $scope.tabs[tab].active = true;
            }
        };

        // Switch tab back to output if we hit submit
        $scope.$watch('submitted', function(submitted) {
            if (submitted) {
                $scope.setTab('output');
            }
        });

        $scope.$watch('result', function (result) {
            passFailNos(result);
            replays(result);
        });

        function passFailNos(result) {
            if (!result.failed_tests) return;
            console.log(
                'updateNo: ',
                typeof result.failed_tests,
                result.failed_tests.length
            );
            $scope.failedNo = result.failed_tests.length;
            $scope.passedNo = result.test_cases.length - $scope.failedNo;
        }

        function replays(result) {
            if (!result.coverage || !$scope.$parent.selectedProject.game) return;
            // Array of file no.s of failed tests
            const fails = result.failed_tests.map(f => f.file_no);

            $scope.replays = [];
            for (const r of result.coverage.replays) {
              let [file, inp, sol_out, your_out] = r.split('>>>>');
              file = file.match(/(?!test)\d+(?=.ktest)/g)[0];
              console.log('replay', Number(file), your_out);
              your_out = your_out.split('====')[0];
              $scope.replays.push({
                  fileNo: Number(file),
                  failed: fails.includes(Number(file)),
                  inp,
                  sol_out,
                  your_out,
              });
              console.log('after', your_out);
            }
            console.log('replays', $scope.replays.map(r => r.failed));
        }
    }
]);

controllers.controller('TestcasesPaginationCtrl', [
    '$scope',
    function($scope) {
        // Pagination settings
        $scope.currentPage = 1;
        $scope.maxSize = 5;

        $scope.$watch('currentPage', function() {
        });

        $scope.isFailedTest = function(testNo) {
            console.log("isFailedTest used", testNo, $scope.$parent.$parent.result.failed_tests);
            if (_.findWhere(
                $scope.$parent.$parent.result.failed_tests, {file_no: testNo}
            )) {
                return "failed";
            } else {
                return "";
            }
        }
    }
]);

controllers.controller('TaskMarkedCtrl', [
    '$scope', 'marked',
    function($scope, marked) {
        $scope.md = $scope.$parent.challenge.taskMd;
        $scope.mdHtml = '';

        $scope.testfileEditorOptions = {
            viewportMargin: 5,
            lineWrapping: true,
            lineNumbers: true,
            mode: {
                name: 'text/x-csrc',
                useCPP: true
            },
            theme: 'neo',
        };

        $scope.solutionEditorOptions = {
            viewportMargin: 5,
            lineWrapping: true,
            lineNumbers: true,
            mode: {
                name: 'text/x-csrc',
                useCPP: true
            },
            readOnly: 'nocursor',
            theme: 'neo',
        }

        $scope.$watch('$parent.challenge', function(challenge) {
            let md = challenge.taskMd;
            if (!md)
                md = 'Loading game task...';
            $scope.mdHtml = marked(md);
        });
    }
]);
