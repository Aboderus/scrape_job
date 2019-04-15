
# Scrape job #
	Just for fun project to scrape two jobposting sites and add them to a postgresql database.
    No security, barebones implementation.

# Setup #
	To run:
	 	npm install
		node ./index.js



        To create db as hardcoded in project, in postgresql:

            CREATE USER scripting;
            ALTER USER scripting WITH encrypted password 'cS5TnynBQTNm4npMe3ksPqpJhwdSGhHHSTzG';
            CREATE DATABASE scrape_job;
            \c scrape_job
            
            CREATE TABLE jobs (
                Id SERIAL PRIMARY KEY,
                VacancyTitle varchar(255),
                CompanyName varchar(255),
                Location varchar(255),
                Source varchar(255)
            );

            
            GRANT ALL PRIVILEGES ON TABLE jobs TO scripting;
            GRANT ALL PRIVILEGES ON TABLE jobs_id_seq TO scripting;


# FYI #
    Some helpers:
        If you are unsure about local psql port:
            SELECT * FROM pg_settings WHERE name = 'port';

        To list your pg users:
            SELECT usename FROM pg_user;






