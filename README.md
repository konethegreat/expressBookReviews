# Express Book Review Server

Node.js + Express.js server-side application for an online book retailer.

## Setup

```bash
git clone https://github.com/<your-username>/expressBookReviews.git
cd expressBookReviews/final_project
npm install
node index.js
```

Server runs on `http://localhost:5000`.

## Endpoints

### General users
- `GET /` — list all books (Task 1)
- `GET /isbn/:isbn` — get book by ISBN (Task 2)
- `GET /author/:author` — get books by author (Task 3)
- `GET /title/:title` — get books by title (Task 4)
- `GET /review/:isbn` — get reviews for a book (Task 5)
- `POST /register` — register a new user (Task 6)
- `POST /customer/login` — login (Task 7)

### Registered users (session/JWT protected)
- `PUT /customer/auth/review/:isbn?review=<text>` — add/modify review (Task 8)
- `DELETE /customer/auth/review/:isbn` — delete own review (Task 9)

### Async/Await with Axios (Task 10)
- `GET /async/books` — get all books via async/await
- `GET /async/isbn/:isbn` — get by ISBN via Promise
- `GET /async/author/:author` — get by author via Promise
- `GET /async/title/:title` — get by title via async/await

## Part A — Fork & clone

1. Fork https://github.com/ibm-developer-skills-network/expressBookReviews
2. `git clone https://github.com/<your-username>/expressBookReviews.git`

## Part B — Install packages

```bash
cd expressBookReviews/final_project
npm install
```

## Part C — Authentication

JWT + express-session. The middleware in `index.js` protects `/customer/auth/*` routes.

## Part D — Access as general user / registered user

General users access list/search/review endpoints. Registered users (after login) get a JWT in their session and can add/modify/delete their own reviews.

## Part E — Async/Await with Axios

See `router/general.js` — four methods using async/await and Promises with Axios for the CRUD operations.

## cURL outputs

See the `screenshots/` directory for cURL command + output captures for Tasks 1–11.
