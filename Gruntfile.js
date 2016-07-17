// This file is officially serving no purpose now, but I'm leaving it here in case
// I want to use it again later.

module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		typescript: {
			base: {
				src: ["src/**/*.ts"],
				dest: "js"
			}
		},
		watch: {
			ts: {
				files: "src/**/*.ts",
				tasks: ["typescript"],
				options: {
					interrupt: true,
					debounceDelay: 250
				}
			}
		}
	});

	grunt.loadNpmTasks("grunt-typescript");
	grunt.loadNpmTasks("grunt-newer");
	grunt.loadNpmTasks("grunt-contrib-watch");

	// TypeScript compilation isn't working in Grunt for some reason.
	// Use 'tsc' or an auto-compiling editor.
	grunt.registerTask("default", [/*"newer:exec:gen_grammar", "typescript"*/]);
};
