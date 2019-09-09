# request-time
> Timings for HTTP requests

## Installation

NPM:

> `npm install @abellsmythe/request-time`


## Usage

```javascript
'use strict';

const https = require('https');
const timer = require('@abellsmythe/request-time');

const request = https.get('https://google.com');
const timings = timer(request);

request.on('response', response => {
	response.on('data', () => {});
	response.on('end', () => {
		console.log(timings);
	});
});
```

```javascript
{
    start: 1535708511443,
    socket: 1535708511444,
    lookup: 1535708511444,
    connect: 1535708511582,
    upload: 1535708511887,
    response: 1535708512037,
    end: 1535708512040,
    phases: {
        wait: 1,
        dns: 0,
        tcp: 138,
        request: 305,
        firstByte: 150,
        download: 3,
        total: 597
    } 
}
```

## API

### timer(request)

Returns: `Object`

- `start` - Time when the request started.
- `socket` - Time when a socket was assigned to the request.
- `lookup` - Time when the DNS lookup finished.
- `connect` - Time when the socket successfully connected.
- `upload` - Time when the request finished uploading.
- `response` - Time when the request fired the `response` event.
- `end` - Time when the response fired the `end` event.
- `error` - Time when the request fired the `error` event.
- `phases`
	- `wait` - `timings.socket - timings.start`
	- `dns` - `timings.lookup - timings.socket`
	- `tcp` - `timings.connect - timings.lookup`
	- `request` - `timings.upload - timings.connect`
	- `firstByte` - `timings.response - timings.upload`
	- `download` - `timings.end - timings.response`
	- `total` - `timings.end - timings.start` or `timings.error - timings.start`

If something is not measured yet, it will be `undefined`.

**Note**: The time is a `number` representing the milliseconds elapsed since the UNIX epoch.
