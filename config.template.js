module.exports = {
	// Shared secret for auth token encryption
	tokenPassword: "thisisapassword!",

	// Supported database drivers:
	//   - mysql (recommended)
	//   - sqlite
	//   - dummy (acts like an empty database)
	databaseDriver: "mysql",

	// If true, spew a lot of debug about database access.
	databaseVerbose: false,

	// MySQL connection information, if needed.
	mysqlHost: "localhost",
	mysqlUser: "username",
	mysqlPassword: "password",
	mysqlDatabase: "flowerbox",

	// SQLite information, if needed.
	sqliteFile: ":memory:",

	// True if we want to include stack traces with API failures.
	// Note that this may be considered a security issue because Node stack
	// traces include full path info for scripts.
	includeStackTraces: true
};
