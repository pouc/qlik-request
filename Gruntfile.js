module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jsdoc2md: {
            oneOutputFile: {
                src: ['index.js'],
                dest: 'README.md'
            }
        },
        jscs: {
            src: ['index.js'],
            options: {
                config: '.jscs.json'
            }
        },
        simplemocha: {
            options: {
                ui: 'bdd',
                reporter: 'tap'
            },
            all: {src: ['test/**/*.js']}
        },
        mocha_istanbul: {
            coverage: {
                src: 'test',
                options: {
                    mask: '*.js',
                    coverageFolder: 'coverage',
                    check: {
                        statements: 20,
                        branches: 70,
                        functions: 10,
                        lines: 20
                    }
                }
            }
        },
        coveralls: {
            options: {
                force: false
            },
            default: {
                src: 'coverage/*.info',
                options: {
                }
            }
        },
        bump: {
            options: {
                push: true,
                pushTo: 'origin',
				commitFiles: ['-a']
            }

        },
        shell: {
            publish: {
                command: 'npm publish'
            }
        }
    });

    grunt.loadNpmTasks('grunt-jsdoc-to-markdown');
    grunt.loadNpmTasks('grunt-bump');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-mocha-istanbul');
    grunt.loadNpmTasks('grunt-coveralls');

    grunt.registerTask('patch', 'patch', function() {
        grunt.task.run('bump:patch');
    });
	
	grunt.registerTask('commit', 'commit', function() {
        grunt.task.run('bump:patch');
    });

    grunt.registerTask('release', 'Release a new version, push it and publish it', function() {
        grunt.task.run('jscs', 'simplemocha:all', 'mocha_istanbul:coverage', 'jsdoc2md:oneOutputFile', 'bump:patch', 'shell:publish', 'coveralls:default');
    });

};
