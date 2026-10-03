// Tests for the book review API. Run them with: npm test
//
// The server is started as a child process on a free port, so the tests go through
// the real HTTP interface, including the session cookie and the /async/* routes that
// call the server over HTTP. All data is made up. It lives only in the memory of the
// server process, which is stopped when the tests end.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

let server;
let baseUrl;

const freePort = () => new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, () => {
        const { port } = probe.address();
        probe.close(() => resolve(port));
    });
});

before(async () => {
    const port = await freePort();
    baseUrl = `http://localhost:${port}`;
    server = spawn(process.execPath, ['index.js'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PORT: String(port) },
        stdio: ['ignore', 'pipe', 'inherit'],
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.once('exit', (code) => reject(new Error(`the server exited with code ${code} before it was ready`)));
        server.stdout.on('data', (chunk) => {
            if (String(chunk).includes('Server is running')) resolve();
        });
    });
}, { timeout: 15000 });

after(() => {
    server.kill();
});

// Sends a request and returns the status, the raw text, the parsed JSON (if the body is JSON)
// and the Set-Cookie headers. Pass `cookie` to send a session cookie.
async function call(method, route, { body, cookie } = {}) {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (cookie) headers.cookie = cookie;
    const response = await fetch(baseUrl + route, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch {
        json = undefined;
    }
    return { status: response.status, text, json, setCookie: response.headers.getSetCookie() };
}

// Logs in and returns the session cookie as "name=value".
async function loginAs(username, password) {
    const response = await call('POST', '/customer/login', { body: { username, password } });
    assert.equal(response.status, 200);
    assert.equal(response.text, 'User successfully logged in');
    assert.equal(response.setCookie.length, 1);
    return response.setCookie[0].split(';')[0];
}

async function registerAndLogin(username) {
    const password = 'synthetic-pass';
    const response = await call('POST', '/register', { body: { username, password } });
    assert.equal(response.status, 200);
    return loginAs(username, password);
}

describe('browsing books', () => {
    test('GET / lists the ten books of the shop', async () => {
        const response = await call('GET', '/');

        assert.equal(response.status, 200);
        assert.deepEqual(Object.keys(response.json), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
        assert.equal(response.json['1'].title, 'Things Fall Apart');
        assert.equal(response.json['1'].author, 'Chinua Achebe');
    });

    test('GET /isbn/:isbn returns one book', async () => {
        const response = await call('GET', '/isbn/8');

        assert.equal(response.status, 200);
        assert.equal(response.json.author, 'Jane Austen');
        assert.equal(response.json.title, 'Pride and Prejudice');
    });

    test('GET /isbn/:isbn gives 404 for an unknown ISBN', async () => {
        const response = await call('GET', '/isbn/999');

        assert.equal(response.status, 404);
        assert.deepEqual(response.json, { message: 'Book not found' });
    });

    test('GET /author/:author returns every book of that author, keyed by ISBN', async () => {
        const response = await call('GET', '/author/Unknown');

        assert.equal(response.status, 200);
        assert.deepEqual(Object.keys(response.json), ['4', '5', '6', '7']);
    });

    test('GET /author/:author handles names with spaces and accents', async () => {
        const response = await call('GET', `/author/${encodeURIComponent('Honoré de Balzac')}`);

        assert.equal(response.status, 200);
        assert.equal(response.json['9'].title, 'Le Père Goriot');
    });

    test('GET /author/:author gives 404 when the author has no books', async () => {
        const response = await call('GET', '/author/Nobody');

        assert.equal(response.status, 404);
        assert.deepEqual(response.json, { message: 'No books found for this author' });
    });

    test('GET /title/:title returns the matching book', async () => {
        const title = 'Molloy, Malone Dies, The Unnamable, the trilogy';
        const response = await call('GET', `/title/${encodeURIComponent(title)}`);

        assert.equal(response.status, 200);
        assert.deepEqual(Object.keys(response.json), ['10']);
        assert.equal(response.json['10'].author, 'Samuel Beckett');
    });

    test('GET /title/:title gives 404 for an unknown title', async () => {
        const response = await call('GET', '/title/No%20such%20book');

        assert.equal(response.status, 404);
        assert.deepEqual(response.json, { message: 'No books found with this title' });
    });

    test('GET /review/:isbn returns the reviews of a book', async () => {
        const response = await call('GET', '/review/8');

        assert.equal(response.status, 200);
        assert.deepEqual(response.json, {});
    });

    test('GET /review/:isbn gives 404 for an unknown ISBN', async () => {
        const response = await call('GET', '/review/999');

        assert.equal(response.status, 404);
        assert.deepEqual(response.json, { message: 'Book not found' });
    });
});

describe('registration and login', () => {
    test('registering needs a username and a password', async () => {
        const response = await call('POST', '/register', { body: { username: 'only-a-name' } });

        assert.equal(response.status, 404);
        assert.deepEqual(response.json, { message: 'Unable to register user.' });
    });

    test('a username can be registered only once', async () => {
        const body = { username: 'registered-twice', password: 'synthetic-pass' };

        const first = await call('POST', '/register', { body });
        const second = await call('POST', '/register', { body });

        assert.equal(first.status, 200);
        assert.deepEqual(first.json, { message: 'User successfully registered. Now you can login' });
        assert.equal(second.status, 404);
        assert.deepEqual(second.json, { message: 'User already exists!' });
    });

    test('logging in needs a username and a password', async () => {
        const response = await call('POST', '/customer/login', { body: { username: 'only-a-name' } });

        assert.equal(response.status, 404);
        assert.deepEqual(response.json, { message: 'Error logging in. Username/password required.' });
    });

    test('logging in with a wrong password is refused', async () => {
        await call('POST', '/register', { body: { username: 'wrong-password', password: 'synthetic-pass' } });

        const response = await call('POST', '/customer/login', {
            body: { username: 'wrong-password', password: 'something-else' },
        });

        assert.equal(response.status, 208);
        assert.deepEqual(response.json, { message: 'Invalid Login. Check username and password' });
    });

    test('logging in with the right password returns a session cookie', async () => {
        await call('POST', '/register', { body: { username: 'right-password', password: 'synthetic-pass' } });

        const cookie = await loginAs('right-password', 'synthetic-pass');

        assert.match(cookie, /^connect\.sid=.+/);
    });
});

describe('reviews', () => {
    test('adding a review needs a login', async () => {
        const response = await call('PUT', '/customer/auth/review/2?review=Nice');

        assert.equal(response.status, 403);
        assert.deepEqual(response.json, { message: 'User not logged in' });
    });

    test('deleting a review needs a login', async () => {
        const response = await call('DELETE', '/customer/auth/review/2');

        assert.equal(response.status, 403);
        assert.deepEqual(response.json, { message: 'User not logged in' });
    });

    test('a made-up session cookie is not accepted', async () => {
        const response = await call('PUT', '/customer/auth/review/2?review=Nice', {
            cookie: 'connect.sid=s%3Anot-a-real-session.not-a-real-signature',
        });

        assert.equal(response.status, 403);
        assert.deepEqual(response.json, { message: 'User not logged in' });
    });

    test('a logged-in user can add, change and delete their own review', async () => {
        const cookie = await registerAndLogin('reviewer-one');

        const added = await call('PUT', '/customer/auth/review/2?review=Lovely%20tales', { cookie });
        assert.equal(added.status, 200);
        assert.deepEqual(added.json.reviews, { 'reviewer-one': 'Lovely tales' });

        const changed = await call('PUT', '/customer/auth/review/2?review=Still%20lovely', { cookie });
        assert.equal(changed.status, 200);
        assert.deepEqual(changed.json.reviews, { 'reviewer-one': 'Still lovely' });
        assert.deepEqual((await call('GET', '/review/2')).json, { 'reviewer-one': 'Still lovely' });

        const deleted = await call('DELETE', '/customer/auth/review/2', { cookie });
        assert.equal(deleted.status, 200);
        assert.deepEqual(deleted.json.reviews, {});
        assert.deepEqual((await call('GET', '/review/2')).json, {});
    });

    test('a user can only delete their own review', async () => {
        const first = await registerAndLogin('reviewer-two');
        const second = await registerAndLogin('reviewer-three');
        await call('PUT', '/customer/auth/review/3?review=First', { cookie: first });
        await call('PUT', '/customer/auth/review/3?review=Second', { cookie: second });
        assert.deepEqual((await call('GET', '/review/3')).json, {
            'reviewer-two': 'First',
            'reviewer-three': 'Second',
        });

        const deleted = await call('DELETE', '/customer/auth/review/3', { cookie: first });
        assert.equal(deleted.status, 200);
        assert.deepEqual((await call('GET', '/review/3')).json, { 'reviewer-three': 'Second' });

        const again = await call('DELETE', '/customer/auth/review/3', { cookie: first });
        assert.equal(again.status, 404);
        assert.deepEqual(again.json, { message: 'Review not found for this user' });

        await call('DELETE', '/customer/auth/review/3', { cookie: second });
        assert.deepEqual((await call('GET', '/review/3')).json, {});
    });

    test('a review needs text and an existing book', async () => {
        const cookie = await registerAndLogin('reviewer-four');

        const noText = await call('PUT', '/customer/auth/review/4', { cookie });
        assert.equal(noText.status, 400);
        assert.deepEqual(noText.json, { message: 'Review query parameter is required' });

        const noBook = await call('PUT', '/customer/auth/review/999?review=Nice', { cookie });
        assert.equal(noBook.status, 404);
        assert.deepEqual(noBook.json, { message: 'Book not found' });

        const noBookDelete = await call('DELETE', '/customer/auth/review/999', { cookie });
        assert.equal(noBookDelete.status, 404);
        assert.deepEqual(noBookDelete.json, { message: 'Book not found' });
    });
});

describe('async routes (Axios calls to the same server)', () => {
    test('/async/books returns the same books as /', async () => {
        const direct = await call('GET', '/');
        const viaAxios = await call('GET', '/async/books');

        assert.equal(viaAxios.status, 200);
        assert.deepEqual(viaAxios.json, direct.json);
    });

    test('/async/isbn/:isbn returns the same book as /isbn/:isbn', async () => {
        const direct = await call('GET', '/isbn/1');
        const viaAxios = await call('GET', '/async/isbn/1');

        assert.equal(viaAxios.status, 200);
        assert.deepEqual(viaAxios.json, direct.json);
    });

    test('/async/author/:author returns the same books as /author/:author', async () => {
        const route = `/author/${encodeURIComponent('Jane Austen')}`;
        const direct = await call('GET', route);
        const viaAxios = await call('GET', `/async${route}`);

        assert.equal(viaAxios.status, 200);
        assert.deepEqual(viaAxios.json, direct.json);
    });

    test('/async/title/:title returns the same books as /title/:title', async () => {
        const route = `/title/${encodeURIComponent('Pride and Prejudice')}`;
        const direct = await call('GET', route);
        const viaAxios = await call('GET', `/async${route}`);

        assert.equal(viaAxios.status, 200);
        assert.deepEqual(viaAxios.json, direct.json);
    });
});
