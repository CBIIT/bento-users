# Bento AuthN/AuthZ service

## Environmental Variables
Following environmental variables are needed

- VERSION : version number
- DATE : build date
- COOKIE_SECRET : secret used to sign cookies
- SESSION_TIMEOUT : session timeout in seconds, default is 30 minutes
- EMAILS_ENABLED : If not set to "true", then the email notifications will be disabled
# Neo4j configuration
- NEO4J_URI: Bolt URI of the Neo4j database
- NEO4J_USER: Neo4j username
- NEO4J_PASSWORD: Neo4j password
# Test-data loading configuration
- DATA_LOADING_MODE : (for testing only) set to "overwrite" to wipe the database before loading
- DATA_FILE : (for testing only) file containing data to load into the database for testing
# MYSQL configuration
- MYSQL_HOST : The host URL of the MYSQL database
- MYSQL_PORT : The port of the MYSQL database
- MYSQL_USER : The service user of the MYSQL database
- MYSQL_PASSWORD : The password for the service user of the MYSQL database
- MYSQL_DATABASE : The MYSQL database name
# Email notification configuration
- EMAIL_SMTP_HOST: email server hostname
- EMAIL_SMTP_PORT: email server port number
# Additional configuration for email server
- EMAIL_USER: email server's username as an additional parameter
- EMAIL_PASSWORD: email server's password as an additional parameter
# Seed Data
- SEED_DATA_FILE: A yaml file containing data for a seed admin and seed arms that will be loaded when no admins nor arms are found (example file: yaml/seed-data-example.yaml)
