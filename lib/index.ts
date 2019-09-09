// @ts-ignore
import deferToConnect from 'defer-to-connect';
import { EventEmitter } from 'events';
import { ClientRequest, IncomingMessage } from 'http';
import { Socket } from 'net';

export interface Timings {
	connect?: number;
	dnsLookup?: number;
	end?: number;
	error?: number;
	phases: {
		dns?: number;
		download?: number;
		firstByte?: number;
		request?: number;
		tcp?: number;
		total?: number;
		wait?: number;
	};
	response?: number;
	socket?: number;
	start: number;
	tlsHandshake?: number
	upload?: number;
}

export default (request: ClientRequest): Timings => {
    const NS_PER_SEC = 1e9;
    const MS_PER_NS = 1e6;

    /**
     * Get duration in milliseconds from process.hrtime()
     * @function getHrTimeDurationInMs
     * @param {Array} time - [seconds, nanoseconds]
     * @return {Number} durationInMs
     */
    const getHrTimeDurationInMs = (time: [number, number]): number =>
        (time[0] * NS_PER_SEC + time[1]) / MS_PER_NS;

	const timings: Timings = {
		connect: undefined,
		dnsLookup: undefined,
		end: undefined,
		error: undefined,
		phases: {
			dns: undefined,
			download: undefined,
			firstByte: undefined,
			request: undefined,
			tcp: undefined,
			total: undefined,
			wait: undefined,
		},
		response: undefined,
		socket: undefined,
		start: getHrTimeDurationInMs(process.hrtime()),
		tlsHandshake: undefined,
		upload: undefined,
    };

	const handleError = (origin: EventEmitter): void => {
		const emit = origin.emit.bind(origin);
		origin.emit = (event, ...args) => {
			// Catches the `error` event
			if (event === 'error') {
				timings.error = getHrTimeDurationInMs(process.hrtime());
				timings.phases.total = timings.error - timings.start;

				origin.emit = emit;
			}

			// Saves the original behavior
			return emit(event, ...args);
		};
	};

	let uploadFinished = false;
	const onUpload = (): void => {
		timings.upload = getHrTimeDurationInMs(process.hrtime());
		timings.phases.request = timings.upload - timings.connect!;
	};

	handleError(request);

	request.once('socket', (socket: Socket): void => {
		timings.socket = getHrTimeDurationInMs(process.hrtime());
		timings.phases.wait = timings.socket - timings.start;

		const lookupListener = (): void => {
			timings.dnsLookup = getHrTimeDurationInMs(process.hrtime());
			timings.phases.dns = timings.dnsLookup - timings.socket!;
		};

		socket.once('lookup', lookupListener);

		socket.on('secureConnect', () => {
			timings.tlsHandshake = getHrTimeDurationInMs(process.hrtime())
		})

		deferToConnect(socket, () => {
			timings.connect = getHrTimeDurationInMs(process.hrtime());

			if (timings.dnsLookup === undefined) {
				socket.removeListener('lookup', lookupListener);
				timings.dnsLookup = timings.connect;
				timings.phases.dns = timings.dnsLookup - timings.socket!;
			}

			timings.phases.tcp = timings.connect - timings.dnsLookup;

			if (uploadFinished && !timings.upload) {
				onUpload();
			}
		});
	});

	request.once('finish', () => {
		uploadFinished = true;

		if (timings.connect) {
			onUpload();
		}
	});

	request.once('response', (response: IncomingMessage): void => {
		timings.response = getHrTimeDurationInMs(process.hrtime());
		timings.phases.firstByte = timings.response - timings.upload!;

		handleError(response);

		response.once('end', () => {
			timings.end = getHrTimeDurationInMs(process.hrtime());
			timings.phases.download = timings.end - timings.response!;
			timings.phases.total = timings.end - timings.start;
		});
	});

	return timings;
};
