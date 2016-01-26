### landsat-api vector tiles updater

This application is designed to run on IronWorker from Iron.io and update a Mapbox vector tile set on a regular basis to power the frontend for ad-next.

### Installation

- Make sure latest version of `docker` with `docker-compose` is installed and launched
- Install latest version of Iron.io CLI

        $ curl -sSL http://get.iron.io/cli | sh

- Create `iron.json` for upload to iron.io. Use `iron.json.sample` as template
- Create `payload.json` if you plan to test the tool locally. Use `payload.json.sample` as a template.


### Local test

    $ docker-compose run test

### Local shell

    $ docker-compose run shell

### Automatic Deployment

Changes made on `master` will be deployed automatically by Travis.

### Manual Deployment

You should copy `iron.json` to the updater folder before running this command.

    $ docker-compose run deploy

