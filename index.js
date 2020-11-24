const axios = require ('axios');
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

const holisticdev_api_url = 'https://api.holistic.dev/api/v1';
const api_key = process.env.HOLISTICDEV_API_KEY;
const connectionString = process.env.PG_CONNECTION_STRING;
const project_name = process.env.HOLISTICDEV_PROJECT_NAME;

const sql = `
SELECT 
  json_agg(u)
FROM (
  SELECT
    DISTINCT ON (queryid)
      queryid :: varchar AS name,
      query AS source,
      SUM(calls) :: varchar AS calls,
      SUM(total_time) :: varchar AS total_time,
      MIN(min_time) :: varchar AS min_time,
      MAX(max_time) :: varchar AS max_time,
      AVG(mean_time) :: varchar AS mean_time,
      SUM(rows) :: varchar AS rows
  FROM pg_stat_statements pgss
    JOIN pg_database pgd ON pgss.dbid = pgd.oid
  WHERE
    pgd.datname = current_database()
    AND
    queryid IS NOT NULL
  GROUP BY
    queryid, query
) u
`;

exports.handler = async function (event, context) {
  try{
    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
        ca: fs.readFileSync('./CA.pem').toString(),
      },
    });
    
    client.connect();

    client.query(sql, [], (err, res) => {
      if(err == null  && res.rows[0] != null){
        const data = {
          project: {
            name: project_name
          },
          pgss: Buffer.from(JSON.stringify(res.rows[0].json_agg)).toString('base64'),
        };

        axios({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': api_key,
          },
          data,
          url: `${holisticdev_api_url}/pg_stat_statements`,
        }).then((response) => {
          console.log(response.data);
        })
        .catch(function (error) {
          console.error('api.holistic.dev error:');
          console.error(JSON.stringify(error.response.data, null, 2));
        });
        return;
      }
      client.end();
      console.error('db query error:', err.message);
    });
  }catch(error){
    console.error('core error: ', error.message)
  }
};