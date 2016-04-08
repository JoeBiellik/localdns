# localdns
[![License](https://img.shields.io/github/license/JoeBiellik/localdns.svg)](LICENSE.md)
[![Release Version](https://img.shields.io/github/release/JoeBiellik/localdns.svg)](https://github.com/JoeBiellik/localdns/releases)
[![Dependencies](https://img.shields.io/david/JoeBiellik/localdns.svg)](https://david-dm.org/JoeBiellik/localdns)

Tiny [Node.js](https://nodejs.org/) dynamic DNS service built with [dnsd](https://www.npmjs.com/package/dnsd), [Express.js](http://expressjs.com/), [MongoDB](https://www.mongodb.org/), [Jade](http://jade-lang.com/) and [Bootstrap 4](http://v4-alpha.getbootstrap.com/).

The app consists of two parts; a web frontend with registration, login and IP address mapping and a tiny DNS server which serves records from the database.

> Use it for free at [localdns.in](http://localdns.in/)

## Usage
You can simply login to the website and manage your subdomain and IP address there or you can use the simple HTTP API to update your IP in a script or dynamic DNS client.

### Cron
The easiest way to keep your mapping up to date is to add the following to your crontab which will update your IP every three hours:
```
0 */3 * * * curl -u 'EMAIL:PASSWORD' https://localdns.in/update
```

### ddclient
You can use [ddclient](https://github.com/wimpunk/ddclient) to keep your IP address up to date with the following config:
```
server=localdns.in, \
protocol=dyndns2,   \
login=EMAIL,        \
password=PASSWORD   \
SUBDOMAIN.localdns.in
```

### Router
Comparable routers can directly update your IP address...

## Development
1. Clone this repo:
  ```
  git clone https://github.com/JoeBiellik/localdns.git && cd localdns
  ```

2. Install dependencies:
  ```
  docker-compose run --no-deps app npm install
  ```

3. Start app, DNS server and database:
  ```
  docker-compose up
  ```

4. Test the local DNS server:
  ```
  dig localdns.local @localhost
  ```

5. Register an account and subdomain in your browser at `http://localhost:3000/`

6. Lookup the subdomain and check the IP address:
  ```
  dig example.localdns.local @localhost
  ```

## Deployment
1. Create DNS glue records for `ns1.your.domain` with your domain registrar pointing to your server's IP address and register it as the domain's nameserver.

2. Configure `config/docker.json` with your domain, server IP and any custom records and settings

3. Make sure your server's firewall allows external DNS traffic on port 53 TCP and UDP

4. Start the production stack:
  ```
  docker-compose -f docker-compose.yml -f production.yml up
  ```

5. Test DNS resolution:
  ```
  dig your.domain ANY @ns1.your.domain
  ```
