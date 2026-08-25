# Manual Auth Testing With Postman

This guide is for the JWT login and refresh-token flow. Use it after the NestJS API and database setup are complete.

## Before testing

1. Start Supabase PostgreSQL and confirm `DATABASE_URL` is configured in `.env`.
2. Run the Prisma migration and seed the development user.
3. Start the NestJS API. The examples below assume:

   `http://localhost:4000`

4. Use the seeded email and password from `SEED_USER_EMAIL` and `SEED_USER_PASSWORD`.
5. In Postman, keep the cookie jar enabled. The refresh token is an HttpOnly cookie, so do not copy it into a request body or store it in localStorage.

## 1. Login

Create a `POST` request:

` `

Headers:

`Content-Type: application/json`

Body, using raw JSON:

```json
{
  "email": "the-seeded-email@example.com",
  "password": "the-seeded-password"
}
```

Expected result:

- Status `200 OK`
- JSON response contains an `accessToken`
- Response headers contain a `Set-Cookie` header for the refresh token
- Postman stores the refresh cookie for `localhost`

Save the `accessToken` value in a Postman environment variable named `accessToken`.

## 2. Protected user check

Create a `GET` request:

`http://localhost:4000/auth/me`

Authorization:

- Type: `Bearer Token`
- Token: `{{accessToken}}`

Expected result: `200 OK` with the authenticated user's profile. Without the token, the expected result is `401 Unauthorized`.

## 3. Refresh the access token

Create a `POST` request:

`http://localhost:4000/auth/refresh`

Do not add a request body. Postman should automatically send the refresh cookie from the login response.

Expected result:

- Status `200 OK`
- A new `accessToken` is returned
- A new refresh cookie is returned
- The previous refresh token is no longer valid

Replace the Postman `accessToken` environment variable with the new value.

## 4. Confirm refresh-token rotation

To test rotation, use the old refresh cookie or resend a previously captured refresh request after a successful refresh. The API should reject the reused token with `401 Unauthorized` and invalidate the refresh-token family according to the implementation policy.

## 5. Logout

Create a `POST` request:

`http://localhost:4000/auth/logout`

Do not add a request body. Postman sends the current refresh cookie.

Expected result:

- Status `200 OK`
- The refresh cookie is cleared or expired
- A later `POST /auth/refresh` returns `401 Unauthorized`

## 6. Invalid login checks

Repeat `POST /auth/login` with an unknown email or incorrect password. The API should return `401 Unauthorized` without issuing an access token or refresh cookie.

Repeat it with missing or malformed fields. The API should return `400 Bad Request` from DTO validation.

## Troubleshooting

- `401` on refresh: verify Postman's cookie jar contains the refresh cookie for `localhost`.
- CORS errors in the browser: confirm the Nest API allows the Next.js origin and credentials.
- Database errors: verify `DATABASE_URL`, run the Prisma migration, and run the seed command.
- No access token: inspect the response body and Nest API logs for validation or configuration errors.