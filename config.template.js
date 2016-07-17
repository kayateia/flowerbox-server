module.exports = {
	// Shared secret for auth token encryption
	tokenPassword: "thisisapassword!",

	// Supported database drivers:
	//   - mysql (recommended)
	//   - sqlite
	databaseDriver: "mysql",

	// MySQL connection information, if needed.
	mysqlHost: "localhost",
	mysqlUser: "username",
	mysqlPassword: "password",
	mysqlDatabase: "flowerbox"
};
