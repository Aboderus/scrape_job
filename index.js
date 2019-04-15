const rp = require('request-promise');
const cheerio = require('cheerio');
const { Client } = require('pg');


////////////////////////
/// Scraper class
////////////////////////

class Scraper {
  constructor(opts = {}){
    this.options = Object.assign({}, {
      site: 'monster.se',
      query: 'Data-__26-it',
      psql_user: 'scripting',
      psql_host: 'localhost',
      psql_database: 'scrape_job',
      psql_password: 'cS5TnynBQTNm4npMe3ksPqpJhwdSGhHHSTzG',
      psql_port: 5432  // Default port for psql installation 
    }, opts);
  }

  get requestPromiseSettings(){
    let uri;
    switch(this.options.site) {
      case 'monster.se':
      uri = `https://www.monster.se/jobb/sok/?q=${this.options.query}`;
      break;
      case 'stepstone.se':
      uri = `https://www.stepstone.se/lediga-jobb-i-hela-sverige/${this.options.query}/`;
      break;
    }
    return {
      uri: uri,
      transform: body => cheerio.load(body),
      headers: {
        // Cloak user agent to avoid anti scraping checks.
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36'
      }
    };
  }

  fetchData(){
    return rp(this.requestPromiseSettings)
    .then(($) => {
      return new Promise((resolve, reject) => {
        let jobs = [];
        if(this.options.site == 'monster.se'){
          $("section.card-content").each(function(i, item){
            let logos = $(item).find('.mux-company-logo');
            if(logos.length <= 0){
              return true;
            }
            // This is a proper job listing with a logo

            let title = $(item).find('.title').text().replace(/(\r\n|\n|\r)/gm,"");
            let company = $(item).find('.company .name').text().replace(/(\r\n|\n|\r)/gm,"");
            let location = $(item).find('.location .name').text().replace(/(\r\n|\n|\r)/gm,"");

            if(title && title.length > 0 && company && company.length > 0 && location && location.length > 0){
              jobs.push({
                site: 'Monster',
                title: title,
                company: company,
                location: location
              });
            }

          });
        }else if(this.options.site == 'stepstone.se'){
          $("article").each(function(i, item){

            let title = $(item).find('.description h5').text().replace(/(\r\n|\n|\r)/gm,"");
            let company = $(item).find('.description .text-bold').text().replace(/(\r\n|\n|\r)/gm,"");
            let location = $(item).find('.description .subtitle :nth-child(2)').text().replace(/(\r\n|\n|\r)/gm,"");

            jobs.push({
              site: 'Stepstone',
              title: title,
              company: company,
              location: location
            });

          });
        }
        resolve(jobs);
      });
    })
  }
}


////////////////////////
/// Database class
////////////////////////

class Database {
  constructor(opts = {}){
    this.options = Object.assign({}, {
      psql_user: 'scripting',
      psql_host: 'localhost',
      psql_database: 'scrape_job',
      psql_password: 'cS5TnynBQTNm4npMe3ksPqpJhwdSGhHHSTzG',
      psql_port: 5432  // Default port for psql installation 
    }, opts);

    this.client = new Client({
      user: this.options.psql_user,
      host: this.options.psql_host,
      database: this.options.psql_database,
      password: this.options.psql_password,
      port: this.options.psql_port
    })
  }

  store(data){
    this.client.connect()
    .then(() => {
      // This will insert whatever params it gets to the database, so massive vulnerability for potential attackers. 
      return Promise.all(data.map((job) => {
        return new Promise((resolve, reject) => {
          this.client.query("INSERT INTO jobs (vacancytitle, companyname, location, source) VALUES ($1, $2, $3, $4);", [
            job.title,
            job.company,
            job.location,
            job.site
          ], (err, res) => {
            if (err){
              throw err;
            }
            resolve(res)
          })
        });
      }));
      
    }).then(() => {
      return this.client.end();
    })
    .catch((err) => {
      console.error('connection error', err.stack);
      this.client.end()
    })
  }
}






////////////////////////
/// Runtime code
////////////////////////

let dbSettings = {};

let monsterScraper = new Scraper({
  site: 'monster.se',
  query: 'Data-__26-it',
});

let stepstoneScraper = new Scraper({
  site: 'stepstone.se',
  query: 'data-it',
});

Promise.all([
  monsterScraper.fetchData(),
  stepstoneScraper.fetchData()
]).then((data) => {
  let db = new Database(dbSettings);
  db.store(
    data[0].concat(data[1])
  )
});