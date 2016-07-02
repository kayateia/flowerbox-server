module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		typescript: {
			base: {
				src: ["src/**/*.ts"],
				dest: "js"
			}
		},
		exec: {
			// This should ideally be done only when it needs doing,
			// but I can't find a Grunt plugin that will do that.
			gen_grammar: {
				command: "node_modules/pegjs/bin/pegjs lib/PetalGrammar.pegjs lib/PetalGrammar.js",
				src: "lib/PetalGrammar.pegjs",
				dest: "lib/PetalGrammar.js"
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
	grunt.loadNpmTasks("grunt-exec");
	grunt.loadNpmTasks("grunt-newer");
	grunt.loadNpmTasks("grunt-contrib-watch");

	// TypeScript compilation isn't working in Grunt for some reason.
	// Use 'tsc' or an auto-compiling editor.
	grunt.registerTask("default", ["newer:exec:gen_grammar"/*, "typescript"*/]);
};
